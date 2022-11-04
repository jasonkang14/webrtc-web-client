import './App.css';
import styled from 'styled-components';
import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const configuration = {
  iceServers: [
    {
      urls: [ "stun:tk-turn2.xirsys.com" ]
    }, 
    {
      username: "DUCG96UiETZoJMl2tgOYO0cEaqLDcnHV3VKZIpHZPPG-Y1mgQgWaWKkKCA5Wzj4_AAAAAF8srQBqYXNvbmthbmcxNA==",
      credential: "8f69984e-d84c-11ea-833e-0242ac140004",
      urls: [
        "turn:tk-turn2.xirsys.com:80?transport=udp",
        "turn:tk-turn2.xirsys.com:3478?transport=udp",
        "turn:tk-turn2.xirsys.com:80?transport=tcp",
        "turn:tk-turn2.xirsys.com:3478?transport=tcp",
        "turns:tk-turn2.xirsys.com:443?transport=tcp",
         "turns:tk-turn2.xirsys.com:5349?transport=tcp"
        ]
      }
    ]
}

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
    // console.log("newOffer: ", newOffer);
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
    // console.log("remoteOffer in event handler: ", remoteOffer);
    await pcRef.current.setRemoteDescription(remoteOffer);
    const newAnswer = await pcRef.current.createAnswer(remoteOffer);
    // console.log("new answer: ", newAnswer);
    await pcRef.current.setLocalDescription(newAnswer);
    socketRef.current.emit('new-answer', ({answer: newAnswer, roomId: roomIdRef.current}))
  }

  const handleJoinBtnClick = () => {
    // console.log("signalingState:", pcRef.current.signalingState);
    const socket = io('ws://localhost:8000');
    socketRef.current = socket;
    // console.log("socket: ", socket);
    socket.emit('join', {roomId: roomIdRef.current})
    socket.on('remote-offer', ({offer}) => {
      console.log("remote offer received: ", offer);
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
        console.log("pcRef.current: ", pcRef.current);
      })
    })
  }

  const getLocalVideo = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    localVideoRef.current.srcObject = localStream;
    const localTracks = localStream.getTracks();
    console.log("localTracks: ", localTracks);
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
      console.log("signalingState:", pcRef.current.signalingState);
      if (pcRef.current.signalingState === 'stable' && pcRef.current.iceGatheringState === 'complete') {
        console.log("local ice candidate: ", iceCandidateRef.current);
        socketRef.current.emit('new-ice', {iceCandidates: iceCandidateRef.current, roomId: roomIdRef.current})
      }
    })

    pcRef.current.addEventListener("icegatheringstatechange", () => {
      console.log("iceGatheringState: ", pcRef.current.iceGatheringState);
      if (pcRef.current.signalingState === 'stable' && pcRef.current.iceGatheringState === 'complete') {
        console.log("local ice candidate: ", iceCandidateRef.current);
        socketRef.current.emit('new-ice', {iceCandidates: iceCandidateRef.current, roomId: roomIdRef.current})
      }
    })

    pcRef.current.addEventListener("icecandidate", (event) => {
      iceCandidateRef.current = [...iceCandidateRef.current, event.candidate]
    })

    pcRef.current.addEventListener("track", (event) => {
      console.log("event: ", event);
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