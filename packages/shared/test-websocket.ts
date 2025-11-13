import WebSocket from 'ws'

console.log('🚀 Starting WebSocket test...')

const ws = new WebSocket('ws://0.0.0.0:8765')

ws.on('open', () => {
  console.log('✅ WebSocket Connected!')
  
  const message = {
    type: 'transcribe',
    payload: {
      video_path: '/app/test-videos/IMG_1035.mov',
      json_file_path: '/tmp/test-transcription.json'
    }
  }
  
  console.log('📤 Sending message:', JSON.stringify(message, null, 2))
  ws.send(JSON.stringify(message))
})

ws.on('message', (data) => {
  console.log('📨 RECEIVED MESSAGE:', data.toString())
  
  try {
    const parsed = JSON.parse(data.toString())
    console.log('📋 Type:', parsed.type)
    console.log('📋 Payload:', JSON.stringify(parsed.payload, null, 2))
  } catch (e) {
    console.log('⚠️ Could not parse as JSON')
  }
})

ws.on('error', (error) => {
  console.error('❌ WebSocket ERROR:', error)
})

ws.on('close', () => {
  console.log('❌ WebSocket connection closed')
  process.exit(0)
})

// Keep alive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('💓 Connection alive, readyState:', ws.readyState)
  } else {
    console.log('💀 Connection dead, readyState:', ws.readyState)
  }
}, 5000)

// Don't exit automatically, let it run
console.log('⏱️ Test will run for 2 minutes...')
setTimeout(() => {
  console.log('⏱️ Test timeout, closing...')
  ws.close()
  process.exit(0)
}, 120000)