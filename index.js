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
