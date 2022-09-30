import {useEffect, useRef} from 'react';
import './App.css';

function App() {
  const localVideoRef = useRef(null);

  const getLocalVideo = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({video: true})
    localVideoRef.current.srcObject = mediaStream;
  }

  useEffect(() => {
    localVideoRef.current.onloadedmetadata = () => {
      localVideoRef.current.play();
    };
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <video id="localVideo" ref={localVideoRef} />
        <button  onClick={getLocalVideo}>카메라 가져오기</button>
      </header>
    </div>
  );
}

export default App;
