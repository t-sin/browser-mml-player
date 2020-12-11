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

// MML Player API

// Parse `str` and return track information.
const parse = (str) => {};
// Create player object which has scheduled notes and events.
const make_player = (ast) => {};
// Start playing.
const play = (player) => {};
// Stop playing.
const stop = (player) => {};

// For HTML interface
let player = null;
const play_button = () => {
  let mml = document.getElementById('mmlcode').value;
  player = make_player(parse(mml));
  play(player);
}

const stop_button = () => {
  stop(player);
}

// Configure event handlers
document.getElementById('mmlplay').addEventListener('click', play_button);
document.getElementById('mmlstop').addEventListener('click', stop_button);
