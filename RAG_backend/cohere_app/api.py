from threading import Thread
from sentence_transformers import SentenceTransformer
from functools import lru_cache 
from pymilvus import connections, Collection
from .models import CurrentUsingCollection
import re, os
from dotenv import load_dotenv
from langchain.vectorstores import FAISS
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

load_dotenv()

import requests
import json

url = "http://172.16.34.240:8080/v1/chat/completions"
headers = {
    "Content-Type": "application/json"
}

prompt = """
You are an AI assistant designed to assist users by providing simple and clear answers to their questions.
        INSTRUCTIONS:
        - Avoid repeating the same phrase or sentence multiple times.
        - Context is generated from database so user is not aware about context, so understand the user question and respond to it.

        Provide a concise response unless the user requests more details."""


device = "cuda"
host = os.getenv("HOST")
port = os.getenv("PORT")

def get_current_using_collection_value():
    try:
        current_collection = CurrentUsingCollection.objects.first()  
        if current_collection:
            # Assign the collection name to a variable
            collection_name = current_collection.current_using_collection
            return str(collection_name)
        else:
            return None 
    except Exception as e:
        return str(e) 

collection_name = get_current_using_collection_value()

if collection_name:
    MILVUS_COLLECTION = collection_name

def generate_streaming_response(question, context):
    data = {
        "model": "tgi",
        "messages": [
            {
                "role": "system",
                "content": prompt
            },
            {
                "role": "user",
                "content": f"Refer to the Context scrapped from Vector Database {context} and answer for user question {question}"     
            }
        ],
        "stream": True,
        "max_tokens": 1500
    }

    with requests.post(url, headers=headers, data=json.dumps(data), proxies={"http": None, "https": None}, stream=True) as response:
        if response.status_code == 200:
            for chunk in response.iter_lines():
                if chunk:
                    decoded_chunk = chunk.decode('utf-8')
                    if decoded_chunk.startswith("data:"):
                        decoded_chunk = decoded_chunk[5:].strip()
                    
                    if decoded_chunk == "[DONE]":
                        break
                    
                    try:
                        chunk_data = json.loads(decoded_chunk)
                        content = chunk_data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                        
                        if content:
                            yield content
                    except json.JSONDecodeError as e:
                        print(f"JSON Decode Error: {e}")
                        print(f"Raw chunk (decoded): {decoded_chunk}")
                    except Exception as e:
                        print(f"Error processing chunk: {e}")
        else:
            print(f"Error: {response.status_code}")

connections.connect("default", host=host, port= port)
collection = Collection(MILVUS_COLLECTION)
collection.load()
embedding_model = SentenceTransformer('/home/qa-prod/Desktop/QA/RAG_backend/cohere_app/embedding_model')

def clean_string(input_string):
    cleaned_string = re.sub(r'\s+', ' ', input_string)
    cleaned_string = cleaned_string.strip()
    return cleaned_string

user_sessions = {}
search_params = {"metric_type": "L2", "params": {"ef": 30}}

def process_query(user_input, selected_file, system_id, batch_size=3):
    connections.connect("default", host=host, port= port)
    try:
        # Initialize session if not already present
        if system_id not in user_sessions:
            user_sessions[system_id] = {
                'results': [],
                'current_index': 0,
                'last_query': None
            }
        session = user_sessions[system_id]

        # Handle "continue" command to fetch next batch of results
        if user_input.lower() == "continue":
            if not session['last_query']:
                yield "No previous query found. Please enter a new question."
                return
        
            elif session['current_index'] > len(session['results']):
                yield "No more results to display."
                return
        else:
            # Generate the query vector for a new search
            session['last_query'] = user_input
            query_vector = embedding_model.encode([user_input]).tolist()

            # Perform search with optional file filtering
            if selected_file:
                formatted_files = ", ".join([f"'{file}'" for file in selected_file])
                expr = f"source in [{formatted_files}]"
            else:
                expr = None

            search_results = collection.search(
                data=query_vector,
                anns_field="vector", 
                param=search_params,
                limit=15,
                output_fields=["source", "page", "text"],
                consistency_level="Strong",
                expr=expr
            )
            # Convert SearchResult to a flat list of hits
            all_hits = []
            for hits in search_results:
                all_hits.extend(hits)  # Collect all individual hit objects
            session['results'] = all_hits
            session['current_index'] = 0
        # Fetch the current batch of results
        start_index = session['current_index']
        end_index = start_index + batch_size
        batch_results = session['results'][start_index:end_index]
        session['current_index'] = end_index
        # Process batch results into context for response
        context = '\n---\n'.join(
            f"File: {hit.entity.get('source')}\nPage: {hit.entity.get('page')}\nText: {hit.entity.get('text')}"
            for hit in batch_results
        )
        current_question = session['last_query'] if user_input.lower() == "continue" else user_input
        for chunk in generate_streaming_response(current_question, context):
            yield chunk
        # yield generate_response(final_prompt)
        sources = [
            f"Source: {hit.entity.get('source')} | Page: {hit.entity.get('page')}"
            for hit in batch_results
        ]
       
        yield '\n'.join(sources)

    except Exception as e:
        yield f"Error occurred: {str(e)}"

@lru_cache(maxsize=None)
def get_all_files_from_milvus():
    connections.connect("default", host=host, port= port)
    collection = Collection(MILVUS_COLLECTION)
    iterator = collection.query_iterator(batch_size=1000,output_fields=["source"])
    results=[]
    while True:
        result = iterator.next()
        if not result:
            iterator.close()
            break
        results.extend(result)
    
    database_files = []
    for result in results:
        database_files.append(result['source'])
    database_files = list(set(database_files))
    connections.disconnect("default")
    return database_files

def create_faiss_index(doc_path: str, faiss_folder: str):
    loader = PyPDFLoader(doc_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=50)
    split_docs = text_splitter.split_documents(documents)
    faiss_index = FAISS.from_documents(split_docs, embeddings)
    os.makedirs(faiss_folder, exist_ok=True)
    faiss_index.save_local(faiss_folder)
    print(f"FAISS index saved to: {faiss_folder}")

def chat_with_uploaded_document(faiss_folder, query, top_k = 3):
    faiss_index = FAISS.load_local(faiss_folder, embeddings)
    search_results = faiss_index.similarity_search(query, k=top_k)
    context = ""
    for i, result in enumerate(search_results):
        context+= result['text']
    for chunk in generate_streaming_response(query, context):
            yield chunk
