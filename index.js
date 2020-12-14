////
// Utilities

// Frequency that cossresponds to concert A.
const concert_a_freq = 440;
// MIDI note number that denotes concert A.
const concert_a_notenum = 69;

// Converts MIDI note number to frequency in the equal temperament.
const convert_to_frequency = (notenum) => {
  // calculate how high/low the `notenum` from concert A.
  const from_concert_a = notenum - concert_a_notenum;
  // calculate actual frequency.
  // in the equal temperament, the smallest interval is `2^(1/12)`.
  const freq = Math.pow(2, from_concert_a / 12) * concert_a_freq;
  return freq;
};

// Calculate MIDI note number from note name, octave and half note.
const calculate_note_number = (name, octave, half_note) => {
  let note_number = 0;
  switch (name) {
    case 'c': note_number = 60; break;
    case 'd': note_number = 62; break;
    case 'e': note_number = 64; break;
    case 'f': note_number = 65; break;
    case 'g': note_number = 67; break;
    case 'a': note_number = 69; break;
    case 'b': note_number = 71; break;
  }
  switch (half_note) {
    case '+': note_number += 1; break;
    case '-': note_number -= 1; break;
    default: break;
  }
  note_number += (octave - 4) * 12;

  return note_number;
};

// Calculate time from note length and bpm.
const calculate_length = (note_length, bpm) => {
  let whole_note_length = bpm / 4;
  let length_in_time = Math.pow(0.5, note_length - 1);
  return length_in_time;
};

// syntactic elements
const syntax_note = /^([cdefgab])([0-9])([+-]?):([0-9]+)$/;
const syntax_rest = /^([r=]):([0-9]+)$/;
const syntax_track = /^---$/;
const syntax_param = /^@([^@=]+)=(-?[0-9]+(.[0-9]+)?)$/;

const syntax_type = (token) => {
  if (syntax_note.test(token)) {
    return 'note';
  } else if (syntax_rest.test(token)) {
    return 'rest';
  } else if (syntax_track.test(token)) {
    return 'track_separator';
  } else if (syntax_param.test(token)) {
    return 'param';
  } else {
    return undefined;
  }
};

// Parse string and return an array of parsed tokens.
const parse_tokens = (str) => {
  let tokens = str.split(/[ \n]+/);
  let ast_list = [];

  for (token of tokens) {
    let node = null;
    let match = null;

    switch (syntax_type(token)) {
      case 'note':
        match = token.match(syntax_note);
        node = {
          'type': 'note',
          'note_name': match[1],
          'octave': Number.parseFloat(match[2]),
          'half_note': match[3],
          'length': Number.parseFloat(match[4]),
        };
        break;

      case 'rest':
        match = token.match(syntax_rest);
        node = {
          'type': 'rest',
          'note_name': match[1],
          'length': Number.parseFloat(match[2]),
        }
        break;

      case 'track_separator':
        match = token.match(syntax_rest);
        node = {
          'type': 'track_separator',
        }
        break;

      case 'param':
        match = token.match(syntax_rest);
        node = {
          'type': 'param',
          'name': match[1],
          'value': Number.parseFloat(match[2]),
        }
        break;

      default:
        throw Error(`unknown token '${token}'`);
    }

    ast_list.push(node);
  }

  return ast_list;
};

// Split tokens into arrays by track_separators.
const split_into_tracks = (tokens) => {
  let tracks = [[]];

  for (let token of tokens) {
    if (token.type === 'track_separator') {
      tracks.push(new Array());
    } else {
      tracks[tracks.length - 1].push(token);
    }
  }

  return tracks;
};

////
// MML Player API

// Parse `str` and return a track array.
const parse = (str) => {
  return split_into_tracks(parse_tokens(str));
};

// Create player object which has scheduled notes and events.
const make_player = (tracks) => {
  let ctx = new AudioContext();
  ctx.suspend();

  let player = {
    'context': ctx,
    'bpm': 120,
  };

  for (let track of tracks) {
    // These control pan and volume of this track.
    let track_panner = new PannerNode(ctx);
    let track_gain = new GainNode(ctx);
    // `osc_gain` is for control note on/off by setting its volume.
    let osc_gain = new GainNode(ctx);
    let osc = new OscillatorNode(ctx);
    osc.type = 'square';
    osc.start();
    osc_gain.gain.value = 0;

    // Schedules note events and paramater changing events.
    let time = 0;
    let freq = 0;
    let pitch = 0;
    let len = 0;

    for (let token of track) {
      switch (token.type) {
        case 'note':
          let note_number = calculate_note_number(token.note_name, token.octave, token.half_note);
          freq = pitch + convert_to_frequency(note_number);
          len = calculate_length(token.length, player.bpm);

          // Set osc sound on.
          osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
          osc_gain.gain.setValueAtTime(1, ctx.currentTime + time);

          // Set osc sound off.
          time += len;
          osc_gain.gain.setValueAtTime(0, ctx.currentTime + time);
          break;

        case 'rest':
          len = calculate_length(token.length, player.bpm);

          if (token.note_name == 'r') {
            // Set osc sound off (rest note).
            osc_gain.gain.setValueAtTime(0, ctx.currentTime + time);
            time += len;

          } else if (token.note_name == '=') {
            // Set osc sound on with previously same frequency.
            osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
            osc_gain.gain.setValueAtTime(1, ctx.currentTime + time);

            // Set osc sound off.
            time += len;
            osc_gain.gain.setValueAtTime(0, ctx.currentTime + time);
          }

          break;

        case 'param':
          switch (token.name) {
            case 'sys.bpm': player.bpm = token.value; break;
            case 'pan':     track_panner.positionX.setValueAtTime(token.value, time); break;
            case 'volume':  track_gain.gain.setValueAtTime(token.value, time); break;
            case 'pitch': pitch = token.value; break;
          }
          break;
      }
    }

    // Connect track nodes by serial.
    osc.connect(osc_gain);
    osc_gain.connect(track_panner);
    track_panner.connect(track_gain);
    track_gain.connect(ctx.destination);
  }

  return player;
};

// Start playing.
const play = (player) => {
  player.context.resume();
};

// Stop playing.
const stop = (player) => {
  player.context.close();
};


////
// For HTML interface

let player = null;
const play_button = () => {
  let mml = document.getElementById('mmlcode').value;

  try {
    player = make_player(parse(mml));
    play(player);
  } catch (e) {
    document.getElementById('mmlconsole').innerText = e;
  }
}

const stop_button = () => {
  if (player !== null) {
    stop(player);
  }
}

// Configure event handlers
document.getElementById('mmlplay').addEventListener('click', play_button);
document.getElementById('mmlstop').addEventListener('click', stop_button);
