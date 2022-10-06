import './App.css';
import styled from 'styled-components';
import { useEffect, useRef } from 'react';

function App() {
  const localVideoRef = useRef(null);

  const getLocalVideo = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    localVideoRef.current.srcObject = mediaStream;
  }

  useEffect(() => {
    localVideoRef.current.onloadedmetadata = () => {
      localVideoRef.current.play();
    }
  }, [])

  return (
    <div className="App">
      <LocalVideo ref={localVideoRef} muted />
      <button onClick={getLocalVideo}>내 카메라 가져오기</button>
    </div>
  );
}

export default App;

const LocalVideo = styled.video``;