

//==============================================================================

//-- Constants -----------------------------------
// Generic geometric and physical constants
export const TAU = Math.PI*2;
export const HEX = 16;
// Audio parameters
export const RATE_SAMPLE = 16000;
export const BPS_DEFAULT = 8;
export const TPB_DEFAULT = 4;
export const CHANNELS_NUMBER = 5;
export const CHANNEL_NOISE = 4;
export const PATTERNS_MAX = 16;
// Pattern cell data masking
// 0b NIVE NNNNNN IIII VVVVVV EEEEEEEEEEEE 
export const MASK_CELL_FLAG_NOTE       = 0b10000000000000000000000000000000;
export const MASK_CELL_FLAG_INSTRUMENT = 0b01000000000000000000000000000000;
export const MASK_CELL_FLAG_VOLUME     = 0b00100000000000000000000000000000;
export const MASK_CELL_FLAG_EFFECT     = 0b00010000000000000000000000000000;
export const MASK_CELL_NOTE_WIDTH = 6;
export const MASK_CELL_NOTE_OFFSET = 22;
export const MASK_CELL_NOTE_STOP = Math.pow(2, MASK_CELL_NOTE_WIDTH)-1;
export const MASK_CELL_INSTRUMENT_WIDTH = 4;
export const MASK_CELL_INSTRUMENT_OFFSET = 18;
export const MASK_CELL_VOLUME_WIDTH = 6;
export const MASK_CELL_VOLUME_OFFSET = 12;
export const MASK_CELL_EFFECT_WIDTH = 12;
export const MASK_CELL_EFFECT_OFFSET = 0;
export const NOTE_NOISE_MAX = 0b1111;
// Client Actions
let INDEX = 1;
export const ACTION_SONG = INDEX++;
export const ACTION_PLAYBACK_PLAY = INDEX++;
export const ACTION_PLAYBACK_STOP = INDEX++;
// Processor Feedback
export const RESPONSE_READY = INDEX++;
export const RESPONSE_PATTERN_ROW = INDEX++;
export const RESPONSE_SONG_END = INDEX++;

//-- Module State --------------------------------
let worklet;
const channel = [];
let songCurrent;

//-- Setup ---------------------------------------
function setup() {
    channel[0] = new Channel(waveSquare);
    channel[1] = new Channel(waveSquare);
    channel[2] = new Channel(waveSaw);
    channel[3] = new Channel(waveTriangle);
    channel[CHANNEL_NOISE] = new Channel(waveNoise);
}


//== Worklet Interface =========================================================

//-- Connection ----------------------------------
if(typeof registerProcessor !== 'undefined') {
    registerProcessor('processor', class extends AudioWorkletProcessor {
        constructor() {
            super();
            worklet = this;
            this.port.onmessage = function (eventMessage) {
                messageReceive(eventMessage.data.action, eventMessage.data.data);
            }
            setup();
            messageSend(RESPONSE_READY, {});
        }
        process(inputs, outputs, parameters) {
            if(!songCurrent) { return true;}
            const output = outputs[0][0];
            let bufferLength = output.length;
            for(let index=0; index < bufferLength; index++) {
                output[index] = songCurrent.sample();
            }
            return true;
        }
    });
}

//-- Messaging -----------------------------------
function messageSend(action, data) {
    worklet.port.postMessage({
        action: action,
        data: data,
    });
}
function messageReceive(action, data) {
    switch(action) {
        case ACTION_PLAYBACK_PLAY:
            if(!songCurrent) { break;}
            songCurrent.play();
            break;
        case ACTION_PLAYBACK_STOP:
            if(!songCurrent) { break;}
            songCurrent.pause();
            break;
        case ACTION_SONG:
            songCurrent = new Song(data);
            for(let aChannel of channel) {
                aChannel.reset();
            }
            break;
    }
}

//== Audio Processors ==========================================================

//-- Abstract Audio Processor --------------------
class AudioProcessor {
    sample() { return 0;}
}

//-- Song Playing --------------------------------
class Song extends AudioProcessor {
    samplesPerRow = RATE_SAMPLE/BPS_DEFAULT
    playing = false
    constructor(dataSong) {
        super();
        this.instrument = dataSong.instruments.map(function (data) {
            return new Instrument(data);
        });
        this.samplesPerRow = Math.floor(RATE_SAMPLE/dataSong.bps);
        this.ticksPerRow = dataSong.tpb;
        this.pattern = dataSong.patterns;
        this.indexPattern = 0;
        this.indexRow = 0;
        this.indexSample = 0;
    }
    sample() {
        if(!this.playing) { return 0;}
        if(!(this.indexSample%this.samplesPerRow)) {
            this.playRow();
        }
        this.indexSample++;
        return (
            channel[0].sample() +
            channel[1].sample() +
            channel[2].sample() +
            channel[3].sample() +
            channel[4].sample()
        );
    }
    playRow() {
        let patternCurrent = this.pattern[this.indexPattern];
        if(this.indexRow >= patternCurrent.length / CHANNELS_NUMBER) {
            this.indexPattern++;
            patternCurrent = this.pattern[this.indexPattern];
            this.indexRow = 0;
        }
        if(!patternCurrent) {
            this.end();
            return;
        }
        messageSend(RESPONSE_PATTERN_ROW, {
            patternId: this.indexPattern,
            row: this.indexRow,
        });
        const dataPattern = this.pattern[this.indexPattern]
        const offsetCell = this.indexRow*CHANNELS_NUMBER;
        for(let indexChannel = 0; indexChannel < CHANNELS_NUMBER; indexChannel++) {
            const cell = dataPattern[offsetCell+indexChannel];
            if(!cell) { continue;}
            const [note, indexInstrument, volume, effect] = cellParse(cell);
            let instrument = null;
            if(indexInstrument !== undefined) {
                instrument = this.instrument[indexInstrument];
            }
            if(volume !== undefined) {
                channel[indexChannel].volumeSet(
                    volume / (Math.pow(2, MASK_CELL_VOLUME_WIDTH)-1)
                );
            }
            if(note === MASK_CELL_NOTE_STOP) {
                channel[indexChannel].noteEnd();
                continue;
            }
            if(note !== undefined && instrument) {
                channel[indexChannel].notePlay(note, instrument);
            }
        }
        this.indexRow++;
    }
    play() {
        this.playing = true;
    }
    pause() {
        this.playing = false;
        for(let indexChannel = 0; indexChannel < CHANNELS_NUMBER; indexChannel++) {
            channel[indexChannel].noteEnd();
        }
    }
    end() {
        this.playing = false;
        this.indexPattern = 0;
        this.indexRow = 0;
        messageSend(RESPONSE_SONG_END, {});
        for(let aChannel of channel) {
            aChannel.reset();
        }
    }
}

//-- Channel -------------------------------------
class Channel extends AudioProcessor {
    constructor(waveForm) {
        super();
        this.wave = new waveForm();
        this.volume = 1;
    }
    reset() {
        delete this.note;
    }
    sample() {
        if(!this.note) { return 0;}
        const noteSample = this.note.sample();
        if(noteSample === null) {
            this.reset();
            return 0;
        }
        return this.wave.sample() * this.volume * noteSample;
    }
    notePlay(note, instrument) {
        this.wave.noteSet(note);
        this.note = new Note(instrument);
    }
    noteEnd() {
        if(!this.note) { return;}
        this.note.cut();
    }
    volumeSet(volumeNew) {
        this.volume = volumeNew;
    }
}

//-- Wave Forms ----------------------------------
class wavePhase extends AudioProcessor{
    phase = 0
    phaseOffset = 0
    phaseLength = undefined
    frequency = undefined
    constructor() {
        super();
        this.setFrequency(1);
    }
    noteSet(note) {
        this.setFrequency(55*Math.pow(2, note/12));
    }
    setFrequency(frequencyNew) {
        //
        this.phaseLength = RATE_SAMPLE / frequencyNew;
        this.frequency = frequencyNew;
        this.phaseOffset = this.phase*this.phaseLength;
    }
    sample() {
        this.phaseOffset = (this.phaseOffset+1) % this.phaseLength;
        this.phase = this.phaseOffset / this.phaseLength;
        return this.phase;
    }
}
class waveSquare extends wavePhase {
    duty = 1/2
    lastValue = 0
    lastCount = 0
    setDuty(dutyNew) { // 16 values possible, only 8 unique
        if(this.phase >= this.duty) {
            if(this.phase < dutyNew) {
                this.phase = dutyNew;
                this.phaseOffset = this.phase*this.phaseLength;
            }
        } else {
            if(this.phase >= dutyNew) {
                this.phase = 0;
                this.phaseOffset = 0;
            }
        }
        this.duty = dutyNew;
    }
    sample() {
        return (super.sample() >= this.duty)? 1 : -1;
    }
}
class waveSaw extends wavePhase {
    sample() {
        return super.sample()*2 - 1;
    }
}
class waveSine extends wavePhase {
    sample() {
        return Math.sin(super.sample() * TAU);
    }
}
class waveTriangle extends wavePhase {
    sample() {
        return Math.abs((super.sample()*4)-2)-1;
    }
}
class waveNoise extends wavePhase { // 16 "frequencies" available, 0=high, 15=low
    // const timerPeriod = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
    // const timerPeriod = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    // When the timer clocks the shift register, the following actions occur in order: 
    //     Feedback is calculated as the exclusive-OR of bit 0 and one other bit: bit 6 if Mode flag is set, otherwise bit 1.
    //     The shift register is shifted right by one bit.
    //     Bit 14, the leftmost bit, is set to the feedback calculated earlier.
    // setFrequency(frequencyNew) {
    //     this.frequency = frequencyNew;
    //     this.phaseOffset = Math.floor(RATE_SAMPLE / this.frequency);
    //     // this.phaseOffset = Math.floor(RATE_SAMPLE / timerPeriod[this.frequency]);
    // }
    sr = 1
    noteSet(note) {
        this.frequency = note+1; // Zero doesn't work with modulo
    }
    sample() {
        this.phase = (this.phase+1)%this.frequency; // see note above
        if(!this.phase) {
            this.sr = (((this.sr ^ (this.sr >>> 1)) & 0b1) << 14) | (this.sr >>> 1);
        }
        return ((this.sr&1)*2)-1;
    }
}

//-- Instrument ----------------------------------
class Instrument extends AudioProcessor {
    constructor(data) {
        super();
        this.sustain = data.sustain;
        this.loopEnd = data.loopEnd;
        this.loopStart = data.loopStart;
        this.envelopeVolume = data.envelopeVolume;
        this.envelopeDuration = data.envelopeDuration;
    }
}

//-- Note ----------------------------------------
class Note extends AudioProcessor {
    constructor(instrument) {
        super();
        this.instrument = instrument;
        this.nodeIndexCurrent = 0;
        this.duration = 0;
        this.volumeGoal = instrument.envelopeVolume[0];
        this.volume = this.volumeGoal;
    }
    sample() {
        //
        if(!this.live && this.nodeIndexCurrent === this.instrument.sustain) {
            return this.instrument.envelopeVolume[this.nodeIndexCurrent];
        }
        if(this.duration-- <= 0) {
            this.nodeIndexCurrent++;
            if(this.nodeIndexCurrent >= this.instrument.envelopeVolume.length) {
                return null;
            }
            if(!this.live && this.nodeIndexCurrent === this.instrument.loopEnd) {
                this.nodeIndexCurrent = this.instrument.loopStart;
            }
            this.volume = this.volumeGoal;
            this.volumeGoal = this.instrument.envelopeVolume[this.nodeIndexCurrent];
            this.duration = this.instrument.envelopeDuration[this.nodeIndexCurrent];
        }
        //
        this.volume += (this.volumeGoal - this.volume) / this.duration;
        return this.volume;
    }
    cut() {
        this.live = true;
    }
}


//== Pattern Building ==========================================================

//------------------------------------------------
export function cell(note, instrument, volume, effect) {
    let R = 0;
    if(Number.isFinite(note)) {
        R |= MASK_CELL_FLAG_NOTE | note << MASK_CELL_NOTE_OFFSET;
    }
    if(Number.isFinite(instrument)) {
        R |= MASK_CELL_FLAG_INSTRUMENT | instrument << MASK_CELL_INSTRUMENT_OFFSET;
    }
    if(Number.isFinite(volume)) {
        R |= MASK_CELL_FLAG_VOLUME | volume << MASK_CELL_VOLUME_OFFSET;
    }
    if(Number.isFinite(effect)) {
        R |= MASK_CELL_FLAG_EFFECT | effect << MASK_CELL_EFFECT_OFFSET;
    }
    return R;
}
export function cellParse(cellData32Bit) {
    let note = (cellData32Bit >> MASK_CELL_NOTE_OFFSET) & (Math.pow(2,MASK_CELL_NOTE_WIDTH)-1);
    let instrument = (cellData32Bit >> MASK_CELL_INSTRUMENT_OFFSET) & (Math.pow(2,MASK_CELL_INSTRUMENT_WIDTH)-1);
    let volume = (cellData32Bit >> MASK_CELL_VOLUME_OFFSET) & (Math.pow(2,MASK_CELL_VOLUME_WIDTH)-1);
    let effect = (cellData32Bit >> MASK_CELL_EFFECT_OFFSET) & (Math.pow(2,MASK_CELL_EFFECT_WIDTH)-1);
    return [
        (cellData32Bit&MASK_CELL_FLAG_NOTE)? note : undefined,
        (cellData32Bit&MASK_CELL_FLAG_INSTRUMENT)? instrument : undefined,
        (cellData32Bit&MASK_CELL_FLAG_VOLUME)? volume : undefined,
        (cellData32Bit&MASK_CELL_FLAG_EFFECT)? effect : undefined,
    ];
}
export function empty() {
    return 0;
}
export function pattern(rows, channels) {
    return new Uint32Array(rows*channels);
}
