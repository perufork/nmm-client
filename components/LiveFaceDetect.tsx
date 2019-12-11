import React, {
  useCallback,
  useState,
  useEffect,
  createRef,
  RefObject
} from 'react'
import Webcam from 'react-webcam'
import { loadModels, detectFacesAndExpression } from '../utils/faceRecog'
import { dataUriToBlob } from '../utils/dataUriToBlob'
import ImagePreview from './ImagePreview'
import logger from '../utils/logger'

import { FaceRecogProperties } from './types'

const WIDTH = 420
const HEIGHT = 420
const INPUT_SIZE = 160
const LIVE_VID_INIT_STATE: Array<FaceRecogProperties> = []

const isServer = typeof window === 'undefined'
// TODO fix up the styling for the camera and if I want the box or some kind of notice that is nicer than a box
export default () => {
  const [liveVid, setLiveVid] = useState(LIVE_VID_INIT_STATE)
  const [facingMode, setFacingMode] = useState('')
  const [dataUri, setDataUri] = useState('')
  const webcamRef: RefObject<any> = createRef()
  let interval: any

  useEffect(() => {
    // TODO - do I need put setInputDevice in useEffect? It may be a bit inefficient
    logger.log({
      level: 'INFO',
      description: 'Running setInputDevice()'
    })
    setInputDevice()
    /**
     * @remark used to prevent fetching when SSR which causes error
     */
    if (!isServer) {
      loadModelsFunc()
    }
    return function cleanup() {
      clearInterval(interval)
    }
  })

  async function loadModelsFunc() {
    await loadModels()
  }

  async function setInputDevice() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()

      const inputDevice = await devices.filter(
        (device: MediaDeviceInfo) => device.kind == 'videoinput'
      )
      // TODO - find a way to change camera from front to back
      if (inputDevice.length < 2) {
        setFacingMode('user')
      } else {
        setFacingMode('environment')
      }
      logger.log({
        level: 'INFO',
        description: 'Running startCapture().'
      })
      startCapture()
    } catch (error) {
      logger.log({
        level: 'ERROR',
        description: error
      })
    }
  }

  function startCapture() {
    interval = setInterval(() => {
      logger.log({
        level: 'INFO',
        description: 'Running capture()'
      })
      capture()
    }, 100)
  }

  async function capture() {
    if (webcamRef.current) {
      const result = await detectFacesAndExpression(
        webcamRef.current.getScreenshot(),
        INPUT_SIZE
      )
      console.log('result', result)

      if (result.length) {
        setLiveVid(result)
      }
    }
  }

  const captureImage = useCallback(() => {
    logger.log({
      level: 'INFO',
      description: 'Running getScreenShot()'
    })
    const imageSrc = webcamRef.current.getScreenshot()
    setDataUri(imageSrc)
    logger.log({
      level: 'INFO',
      description: 'Running dataUriToBlod()'
    })
    dataUriToBlob(imageSrc)
  }, [webcamRef])

  let videoConstraints
  let camera
  if (facingMode) {
    videoConstraints = {
      width: WIDTH,
      height: HEIGHT,
      facingMode: facingMode == 'user' ? 'user' : { exact: facingMode }
    }
    if (facingMode === 'user') {
      camera = 'Front'
    } else {
      camera = 'Back'
    }
  }

  let drawBox
  if (liveVid.length) {
    drawBox = liveVid.map((faceObj: any) => (
      <div>
        <div
          style={{
            position: 'absolute',
            border: 'solid',
            borderColor: 'blue',
            height: faceObj.detection.box.height,
            width: faceObj.detection.box.width,
            transform: `translate(${faceObj.detection.box._x}px,${faceObj.detection.box._y}px)`
          }}
        ></div>
      </div>
    ))
  }

  return (
    <>
      {dataUri ? (
        <ImagePreview dataUri={dataUri} liveVid={liveVid} />
      ) : (
        <div>
          <div
            className="Camera"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <p>Camera: {camera}</p>
            <div
              style={{
                width: WIDTH,
                height: HEIGHT
              }}
            >
              <div style={{ position: 'relative', width: WIDTH }}>
                {!!videoConstraints ? (
                  <div style={{ position: 'absolute' }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={videoConstraints}
                    />
                  </div>
                ) : null}
                {!!drawBox ? drawBox : null}
              </div>
            </div>
          </div>
          <button onClick={captureImage}>Capture photo</button>
        </div>
      )}
    </>
  )
}
