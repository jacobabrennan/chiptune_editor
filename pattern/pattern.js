

//==============================================================================

//-- Dependencies --------------------------------
import {
    cell,
    cellParse,
    CHANNELS_NUMBER,
    MASK_CELL_VOLUME_WIDTH,
    MASK_CELL_NOTE_WIDTH,
    PATTERNS_MAX,
    CHANNEL_NOISE,
    NOTE_NOISE_MAX,
    MASK_CELL_NOTE_STOP,
    HEX,
} from '../processor.js';
import { patternDisplay } from './canvas.js';
import { instrumentIndexGet } from '../editor_instrument/instrument.js';

//-- Constants -----------------------------------
export const DEFAULT_ROWS = 32;

//-- Saving / Loading ----------------------------
export function populateFromData(data) {
    patterns.splice(0);
    for(let patternData of data) {
        patternNew(patternData);
    }
    patternCurrent = patterns[0];
}

//-- Pattern Querying -----------------------------
export function dataGet() {
    return patternCurrent.data;
}
export function patternDataCompile() {
    return patterns.map(pattern => pattern.data);
}
export function patternListGet() {
    const patternData = {
        indexCurrent: patterns.indexOf(patternCurrent),
        length: patterns.length,
        names: patterns.map(
            function (pattern, index) {
                return  `${index.toString(HEX)} ${pattern.name}`;
            }
        ),
    };
    return patternData;
}
export function patternCount() {
    return patterns.length;
}

//-- Pattern Management --------------------------
export function patternSelect(indexPattern) {
    const patternNew = patterns[indexPattern];
    if(!patternNew) { return;}
    patternCurrent = patternNew;
    patternDisplay();
}
export function patternNew(dataLoad) {
    const indexPattern = patterns.length;
    if(indexPattern >= PATTERNS_MAX) { return -1;}
    if(!dataLoad) {
        dataLoad = new Uint32Array(DEFAULT_ROWS*CHANNELS_NUMBER);
    }
    patterns[indexPattern] = {
        data: dataLoad,
        name: 'Pattern',
    };
    return indexPattern;
}
export function patternDelete() {
    let indexPatternCurrent = patterns.indexOf(patternCurrent);
    patterns.splice(indexPatternCurrent, 1);
    // Handle index still valid for pattern list
    if(indexPatternCurrent < patterns.length) {
        patternSelect(indexPatternCurrent);
        return true;
    }
    // Handle valid list, invalid index
    indexPatternCurrent--;
    if(patterns.length) {
        patternSelect(indexPatternCurrent);
        return true;
    }
    // Handle empty list
    indexPatternCurrent = 0;
    patternNew();
    patternSelect(indexPatternCurrent);
    return true;
}

//-- Pattern Length Configuring ------------------
export function lengthGet() {
    return patternCurrent.data.length / CHANNELS_NUMBER;
}
export function lengthAdjust(lengthDelta) {
    const lengthNew = (patternCurrent.data.length / CHANNELS_NUMBER) + lengthDelta;
    return lengthSet(lengthNew);
}
export function lengthSet(lengthNew) {
    lengthNew = Math.max(1, lengthNew);
    const dataOld = patternCurrent.data;
    const dataNew = new Uint32Array(lengthNew*CHANNELS_NUMBER);
    for(let indexData = 0; indexData < dataOld.length; indexData++) {
        dataNew[indexData] = dataOld[indexData];
    }
    patternCurrent.data = dataNew;
    patternDisplay();
    return dataNew.length / CHANNELS_NUMBER;
}

//-- Cell Data Editing ---------------------------
export function cellGet(indexRow, indexChannel) {
    const compoundIndex = indexRow*CHANNELS_NUMBER+indexChannel;
    return patternCurrent.data[compoundIndex];
}
export function cellEdit(row, channel, cellData) {
    patternCurrent.data[(row*CHANNELS_NUMBER)+channel] = cellData;
    patternDisplay();
}
export function cellEditNote(row, channel, noteNew) {
    const indexCell = row*CHANNELS_NUMBER + channel;
    let [noteOld, instrument, volume, effects] = cellParse(patternCurrent.data[indexCell]);
    if(noteNew !== MASK_CELL_NOTE_STOP) {
        if(channel === CHANNEL_NOISE) {
            noteNew = Math.max(0, Math.min(NOTE_NOISE_MAX, noteNew));
        }
        if(instrument === undefined) {
            instrument = instrumentIndexGet();
        }
    }
    noteNew &= Math.pow(2, MASK_CELL_NOTE_WIDTH)-1;
    const cellData = cell(noteNew, instrument, volume, effects);
    patternCurrent.data[indexCell] = cellData;
    cellEdit(row, channel, cellData);
}
export function cellEditInstrument(row, channel, instrument) {
    const indexCell = row*CHANNELS_NUMBER + channel;
    let cellData = cellParse(patternCurrent.data[indexCell]);
    cellData = cell(cellData[0], instrument, cellData[2], cellData[3]);
    cellEdit(row, channel, cellData);
}
export function cellEditVolume(row, channel, volume) {
    const volumeMax = Math.pow(2, MASK_CELL_VOLUME_WIDTH)-1;
    volume = Math.max(0, Math.min(volumeMax, volume));
    const indexCell = row*CHANNELS_NUMBER + channel;
    let cellData = cellParse(patternCurrent.data[indexCell]);
    cellData = cell(cellData[0], cellData[1], volume, cellData[3]);
    patternCurrent.data[indexCell] = cellData;
    cellEdit(row, channel, cellData);
}
export function cellEditEffects(row, channel, effects) {
    const indexCell = row*CHANNELS_NUMBER + channel;
    let cellData = cellParse(patternCurrent.data[indexCell]);
    cellData = cell(cellData[0], cellData[1], cellData[2], effects);
    patternCurrent.data[indexCell] = cellData;
    cellEdit(row, channel, cellData);
}