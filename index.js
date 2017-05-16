const mqtt = require('mqtt')
const Alexa = require('alexa-sdk')
const config = require('./config.js')

const APP_ID = process.env.APP_ID // 'amzn1.ask.skill.806b2881-fd8a-4f32-8405-d2a2e0f8d61f'

const connectToCloudMqtt = () => {
  const url  = `http://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`

  const opts = {
    keepalive: 540,
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PWD
  }

  const mqttClient = mqtt.connect(url, opts)

  mqttClient.on('error', error => console.log('MQTT ERROR: ', error) )
  mqttClient.on('offline', () => console.log('OFFLINE'))

  return mqttClient
}

exports.handler = (event, context, callback) => {
  const alexa = Alexa.handler(event, context)
  alexa.APP_ID = APP_ID
  alexa.registerHandlers(handlers)
  alexa.execute()
}

const idNerfGun = slots => config.nerfGuns[slots.nerfGunIndex ? slots.nerfGunIndex.value - 1 || 0 : 0]

const handlers = {
  'launchDartsIntent': function() {
    const mqtt = connectToCloudMqtt()

    const nrOfDarts = this.event.request.intent.slots.nrOfDarts.value < 6 ? parseInt(this.event.request.intent.slots.nrOfDarts.value, 10) : 1

    mqtt.on('connect', () => {
      mqtt.subscribe(`nerf/${idNerfGun(this.event.request.intent.slots)}/command/launch`, (client, topic, message) => {
        console.log(`subscribed to nerf/${idNerfGun(this.event.request.intent.slots)}/command/launch`)
      })

      mqtt.publish(`nerf/${idNerfGun(this.event.request.intent.slots)}/command/launch`, `{"nrOfDarts":${nrOfDarts}}`)

      mqtt.on('message', (topic, message, packet) => {
        if (topic === `nerf/${idNerfGun(this.event.request.intent.slots)}/command/launch`) {
          mqtt.end()
          this.emit(':tell', `I am instructing your nerf gun to launch ${nrOfDarts} ${nrOfDarts === 1 ? 'dart' : 'darts'}.`)
        }
      })
    })

    mqtt.on('error', () => this.emit(':tell', 'Connection to MQTT Failed'))

  },
}
