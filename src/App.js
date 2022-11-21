import './App.css';
import styled from 'styled-components';
import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const configuration = process.env.ICE_SERVERS

// caller stable -> have-local-offer -> stable
// callee stable -> have-remote-offer -> stable

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const roomIdRef = useRef('randomString');
  const pcRef = useRef(new RTCPeerConnection(configuration));
  const socketRef = useRef(null);
  const iceCandidateRef = useRef([]);

  const createNewOffer = async () => {
    await getLocalVideo();
    const newOffer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(newOffer);
    socketRef.current.emit('new-offer', ({offer: newOffer, roomId: roomIdRef.current}))
  }

  const handleRemoteAnswer = async(answer) => {
    const remoteAnswer = new RTCSessionDescription(answer);
    await pcRef.current.setRemoteDescription(remoteAnswer);
  }

  const handleRemoteOffer = async (offer) => {
    await getLocalVideo();
    const remoteOffer = new RTCSessionDescription(offer)
    await pcRef.current.setRemoteDescription(remoteOffer);
    const newAnswer = await pcRef.current.createAnswer(remoteOffer);
    await pcRef.current.setLocalDescription(newAnswer);
    socketRef.current.emit('new-answer', ({answer: newAnswer, roomId: roomIdRef.current}))
  }

  const handleJoinBtnClick = () => {
    const socket = io(process.env.REACT_APP_SIGNALING_SERVER);
    socketRef.current = socket;
    socket.emit('join', {roomId: roomIdRef.current})
    socket.on('remote-offer', ({offer}) => {
      if (offer) {
        handleRemoteOffer(offer);
        return
      }

      createNewOffer();
    })

    socket.on('remote-answer', ({answer}) => {
      handleRemoteAnswer(answer);
    })

    socket.on('remote-ice', ({iceCandidates}) => {
      iceCandidates.forEach((iceCandidate) => {
        pcRef.current.addIceCandidate(iceCandidate)
      })
    })
  }

  const getLocalVideo = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    localVideoRef.current.srcObject = localStream;
    const localTracks = localStream.getTracks();
    localTracks.forEach((localTrack) => {
      pcRef.current.addTrack(localTrack, localStream);
    })
  }

  useEffect(() => {
    localVideoRef.current.onloadedmetadata = () => {
      localVideoRef.current.play();
    }
  }, [])

  useEffect(() => {
    remoteVideoRef.current.onloadedmetadata = () => {
      remoteVideoRef.current.play();
    }
  }, [])

  useEffect(() => {
    pcRef.current.addEventListener("signalingstatechange", () => {
      if (pcRef.current.signalingState === 'stable' && pcRef.current.iceGatheringState === 'complete') {
        socketRef.current.emit('new-ice', {iceCandidates: iceCandidateRef.current, roomId: roomIdRef.current})
      }
    })

    pcRef.current.addEventListener("icegatheringstatechange", () => {
      if (pcRef.current.signalingState === 'stable' && pcRef.current.iceGatheringState === 'complete') {
        socketRef.current.emit('new-ice', {iceCandidates: iceCandidateRef.current, roomId: roomIdRef.current})
      }
    })

    pcRef.current.addEventListener("icecandidate", (event) => {
      iceCandidateRef.current = [...iceCandidateRef.current, event.candidate]
    })

    pcRef.current.addEventListener("track", (event) => {
      const [remoteStream] = event.streams;
      remoteVideoRef.current.srcObject = remoteStream;
    })
  }, [])

  return (
    <div className="App">
      <Container>
        <LocalVideo ref={localVideoRef} muted />
        <RemoteVideo ref={remoteVideoRef} />
      </Container>
      <button onClick={handleJoinBtnClick}>영상 연결 참여</button>
    </div>
  );
}

export default App;

const Container = styled.div`
  display: flex;
`

const LocalVideo = styled.video`
  width: 500px;
  height: 500px;
`;

const RemoteVideo = styled(LocalVideo)`
  width: 300px;
  height: 300px;
`