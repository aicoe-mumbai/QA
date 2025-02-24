import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeftSidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faSignOutAlt, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { Cascader } from "antd";

function LeftSidebar({ history, onHistoryClick, onFileSelect, onLogout }) {
  const navigate = useNavigate();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [userName, setUserName] = useState('');
  const [options, setOptions] = useState([]);
  const apiUrl = process.env.REACT_APP_API_URL;


  useEffect(() => {
    const storedUserName = sessionStorage.getItem('userName');
    if (storedUserName) {
      const formattedUserName = storedUserName.charAt(0).toUpperCase() + storedUserName.slice(1).toLowerCase();
      setUserName(formattedUserName);
    }
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/documents/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const formattedOptions = data['files'].map(doc => ({
            value: doc,
            label: doc.substring(doc.lastIndexOf('/') + 1),
          }));
          setOptions(formattedOptions);
        } else {
          console.error('Failed to fetch options');
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    };

    fetchOptions();
  }, [apiUrl, navigate]);


  const handleChange = (selected) => {
    setSelectedOptions(selected);
    const selectedFiles = selected ? selected.map(option => option.value) : [];
    onFileSelect(selectedFiles);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${apiUrl}api/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          refresh: sessionStorage.getItem('refreshToken'),
        }),
      });

      if (response.ok) {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.clear();

        onLogout();
        navigate('/login');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };


  const [folderOptions, setFolderOptions] = useState([]);

  
  useEffect(() => {
    fetchFiles();
  },[]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${apiUrl}api/get-folder/`, {
        headers: {
          "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`,
        },
      });
      const data = await response.json();
      setFolderOptions(buildTree(data.files));
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  

  const buildTree = (paths) => {
    const root = {};

    paths.forEach((path) => {
      const parts = path.split("/").filter(Boolean);
      let current = root;

      parts.forEach((part) => {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      });
    });

    const convertToCascaderOptions = (obj) =>
      Object.keys(obj).map((key) => ({
        value: key,
        label: key,
        children: Object.keys(obj[key]).length ? convertToCascaderOptions(obj[key]) : [],
      }));

    return convertToCascaderOptions(root);
  };

  const handleFolderChange = (value) => {
    console.log("Selected Path:", "/" + value.join("/"));
  };

  // const [folderStructure, setFolderStructure] = useState({});
  // const [selectedPath, setSelectedPath] = useState(""); 
  // const [folderOptions, setFolderOptions] = useState([]); 
  // const [currentPath, setCurrentPath] = useState([]); 

  // useEffect(() => {
  //   fetchDirectories();
  // }, []);

  // const fetchDirectories = async () => {
  //   try {
  //     const response = await fetch(`${apiUrl}/api/get-folder/`, {
  //       headers: {
  //         Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
  //       },
  //     });

  //     const data = await response.json();
  //     const nestedFolders = formatFilesToFolders(data.files);
  //     setFolderStructure(nestedFolders);
  //     setFolderOptions(getOptions(nestedFolders, []));
  //   } catch (error) {
  //     console.error("Error fetching files:", error);
  //   }
  // };

  // const formatFilesToFolders = (files) => {
  //   const root = {};

  //   files.forEach((file) => {
  //     const parts = file.split("/").filter(Boolean);
  //     let current = root;

  //     parts.forEach((part, index) => {
  //       if (!current[part]) {
  //         current[part] = index === parts.length - 1 ? null : {};
  //       }
  //       current = current[part];
  //     });
  //   });

  //   return root;
  // };

  // const getOptions = (obj, path) => {
  //   return Object.keys(obj).map((key) => ({
  //     value: key,
  //     label: key,
  //   }));
  // };

  // const handleFolderChange = (selectedOption) => {
  //   if (!selectedOption) return;

  //   const newPath = [...currentPath, selectedOption.value];
  //   setCurrentPath(newPath);
  //   setSelectedPath(newPath.join("/")); 

  //   let current = folderStructure;
  //   for (let part of newPath) {
  //     current = current[part];
  //   }

  //   if (current && typeof current === "object") {
  //     setFolderOptions(getOptions(current, newPath));
  //   } else {
  //     setFolderOptions([]);
  //   }
  // };

  // const handleClear = () => {
  //   setSelectedPath("");
  //   setCurrentPath([]);
  //   setFolderOptions(getOptions(folderStructure, [])); 
  // };


  return (
    <div className="left-sidebar">
      <div className="new">
        <img src="/images/L&T PES - Linear Logo - Black.jpg" alt="A descriptive alt text" className='lnt-logo' />
      </div>

      {/* <div>
        <h2>Select Folder</h2>
        <Cascader options={folderOptions} onChange={handleFolderChange} placeholder="Select a folder" />
      </div>  */}

{/* <div>
      <h3>Select Folder:</h3>
      <Select
        options={folderOptions}
        onChange={handleFolderChange}
        placeholder="Select a folder"
        value={selectedPath ? { label: selectedPath, value: selectedPath } : null}
        isClearable
        onMenuClose={handleClear} // This allows clearing when clicking "x"
      />
    </div> */}

      <div className="multi-select">
        <Select
          isMulti
          name="options"
          options={options}
          value={selectedOptions}
          onChange={handleChange}
          className="multi-select"
        />
      </div>

      <label className="custom-file-input">
        <FontAwesomeIcon icon={faCloudArrowUp} className="upload" />
        Upload document
        <input type="file" />
      </label>

      <div className="history-section">
        <h4>Today</h4>
        <ul>
          {history.today.map((item) => (
            <li key={item.id} onClick={() => onHistoryClick(item.session_id)} title={item.prompt}>
              <FontAwesomeIcon icon={faHistory} className="history-icon" />
              {item.prompt}
            </li>
          ))}
        </ul>

        <h4>Yesterday</h4>
        <ul>
          {history.yesterday.map((item) => (
            <li key={item.id} onClick={() => onHistoryClick(item.session_id)} title={item.prompt}>
              <FontAwesomeIcon icon={faHistory} className="history-icon" />
              {item.prompt}
            </li>
          ))}
        </ul>

        <h4>Last Week</h4>
        <ul>
          {history.last_week.map((item) => (
            <li key={item.id} onClick={() => onHistoryClick(item.session_id)} title={item.prompt}>
              <FontAwesomeIcon icon={faHistory} className="history-icon" />
              {item.prompt}
            </li>
          ))}
        </ul>

        <h4>Last Month</h4>
        <ul>
          {history.last_month.map((item) => (
            <li key={item.id} onClick={() => onHistoryClick(item.session_id)} title={item.prompt}>
              <FontAwesomeIcon icon={faHistory} className="history-icon" />
              {item.prompt}
            </li>
          ))}
        </ul>
      </div>

      <div className="progress-bar"></div>

      <div className="user-card-container">
        <div className="user-details">
          <img
            src="/images/ai-technology.png"
            alt="User Avatar"
            className="user_avatar"
          />
          <span className="user-name">{userName || 'Guest'}</span>
          <div className="user-actions">

            {/* Logout Icon with Tooltip */}
            <div className="icon-with-tooltip">
              <FontAwesomeIcon
                icon={faSignOutAlt}
                className="user-icon"
                onClick={handleLogout}
              />
              <span className="tooltip-text">Logout</span>
            </div>


          </div>
        </div>

      </div>
    </div>
  );
}

export default LeftSidebar;