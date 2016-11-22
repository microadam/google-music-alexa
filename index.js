const Alexa = require('alexa-sdk')
const request = require('express-request-sign/make-signed-request')

exports.handler = function(event, context, callback) {
  const baseUrl = process.env.GOOGLE_MUSIC_PLAYER + '/'
  const apiKey = process.env.API_KEY
  const alexa = Alexa.handler(event, context)

  const RETRY_RESPONSE = 'Sorry, please could you re-phrase that?'

  const handlers = {
    LaunchRequest: function () {
      this.emit(':ask', 'What would you like Google Music to do?', RETRY_RESPONSE);
    },
    MetaIntent: function () {
      perfomBasicAction('meta', (error, response) => {
        if (error) return
        response = response.meta
        if (response) {
          this.emit(':tell', 'Currently playing ' + response.track + ' by ' + response.artist + ' from the album ' + response.album)
        } else {
          this.emit(':tell', 'Nothing is currently playing')
        }
      })
    },
    Unhandled: function () {
      this.emit(':ask', RETRY_RESPONSE, RETRY_RESPONSE);
    }
  }
  const basicHandlers = [
    { intent: 'AMAZON.PauseIntent', action: 'pause', message: 'OK, pausing music' },
    { intent: 'AMAZON.ResumeIntent', action: 'resume', message: 'OK, resuming music' },
    { intent: 'AMAZON.StopIntent', action: 'stop', message: 'OK, stopping music' },
    { intent: 'AMAZON.NextIntent', action: 'next', message: 'OK, skipping track' },
    { intent: 'AMAZON.PreviousIntent', action: 'previous', message: 'OK, playing previous track' }
  ]

  function createHandler(action, message) {
    return function () {
      perfomBasicAction(action.toLowerCase(), (error, response) => {
        if (error) return
        this.emit(':tell', message)
      })
    }
  }

  basicHandlers.forEach((h) => {
    handlers[h.intent] = createHandler(h.action, h.message)
  })

  handlers.ArtistIntent = artistIntent
  handlers.TrackIntent = trackIntent
  handlers.TrackByArtistIntent = trackByArtistIntent
  handlers.AlbumByArtistIntent = albumByArtistIntent
  handlers.PlaylistIntent = playlistIntent
  handlers.StationIntent = stationIntent

  alexa.registerHandlers(handlers)
  alexa.execute()

  function artistIntent() {
    const data = { artist: this.event.request.intent.slots.artist.value }
    performPlayAction.call(this, data, (error, response) => {
      if (error) return
      this.emit(':tell', 'Playing ' + response.artist)
    })
  }

  function trackIntent() {
    const data = { track: this.event.request.intent.slots.track.value }
    performPlayAction.call(this, data, (error, response) => {
      if (error) return
      this.emit(':tell', 'Playing ' + response.track + ' by ' + response.artist)
    })
  }

  function playlistIntent() {
    const data = { playlist: this.event.request.intent.slots.playlist.value }
    performPlayAction.call(this, data, (error, response) => {
      if (error) return
      this.emit(':tell', 'Playing the' + response.playlist + ' playlist')
    })
  }

  function stationIntent() {
    const data = { station: this.event.request.intent.slots.station.value }
    performPlayAction.call(this, data, (error, response) => {
      if (error) return
      this.emit(':tell', 'Playing ' + response.station + ' radio station')
    })
  }

  function trackByArtistIntent() {
    const data = {
      track: this.event.request.intent.slots.track.value,
      artist: this.event.request.intent.slots.artist.value
    }
    performPlayAction.call(this, data, (error, response) => {
      if (error) return
      this.emit(':tell', 'Playing ' + response.track + ' by ' + response.artist)
    })
  }

  function albumByArtistIntent() {
    const data = {
      album: this.event.request.intent.slots.album.value,
      artist: this.event.request.intent.slots.artist.value
    }
    performPlayAction.call(this, data, (error, response) => {
      if (error) return
      this.emit(':tell', 'Playing ' + response.album + ' by ' + response.artist)
    })
  }

  function perfomBasicAction(action, cb) {
    request({ url: baseUrl + action, method: 'GET', apiKey: apiKey }, (error, res, body) => {
      if (error) {
        console.log('ERROR when trying to ' + action + ':', error)
        this.emit(':tell', 'Sorry, something went wrong')
        return cb(error)
      }
      body = JSON.parse(body)
      cb(null, body)
    })
  }

  function performPlayAction(data, cb) {
    console.log('Performing Play Action', data)
    const opts = {
      url: baseUrl + 'play',
      body: data,
      json: true,
      apiKey: apiKey,
      method: 'POST'
    }
    request(opts, (error, res, body) => {
      if (error) {
        console.log('ERROR when trying to play:', error)
        this.emit(':tell', 'Sorry, something went wrong')
        return cb(error)
      }
      console.log('Play Action Response', body)
      if (!body.success) {
        return this.emit(':ask', 'Nothing matched your request, what would you like to do?', RETRY_RESPONSE);
      }
      cb(null, body)
    })
  }
}