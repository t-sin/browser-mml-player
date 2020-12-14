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

// syntactic elements
const syntax_note = /^([cdefgab])([0-9])([+-]?):([0-9]+)$/;
const syntax_rest = /^([r=]):([0-9]+)$/;
const syntax_track = /^---$/;
const syntax_param = /^([^@=]+)=(-?[0-9]+(.[0-9]+))$/;

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

////
// MML Player API

// Parse `str` and return an AST list.
const parse = (str) => {
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

  console.log(ast_list);
  return ast_list;
};

// Create player object which has scheduled notes and events.
const make_player = (ast_list) => {
  let ctx = new AudioContext();
  ctx.suspend();

  let player = {
    'context': ctx,
  };
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
