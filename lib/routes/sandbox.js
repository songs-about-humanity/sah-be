const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();

spotifyApi.setAccessToken('BQDSdZWGeEUeZva1I-ZnOY6u-3IfXKmDil-SqOOHgWxHtDlrgamazwZrRL8iZdxvijJhKBSOLXbTsBKMKY_Y4iC5dOC6TFpPVSdWAhu4DIWvlSzRSMOti3i9XRrYd_PJbEpqlECs5tPaY4c98-uLtRy1fC_hPwXJ5ONEPMZK8nM4754');

spotifyApi.searchTracks('Love')
  .then(function(data) {
    console.log('Search by "Love"', data.body.tracks.items);
  }, function(err) {
    console.error(err);
  });
