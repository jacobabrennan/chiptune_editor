

//==============================================================================

//-- Dependencies --------------------------------
// import Vue from '../libraries/vue.esm.browser.js';
import {
    cellParse,
    CHANNELS_NUMBER,
    HEX,
    CHANNEL_NOISE,
    MASK_CELL_NOTE_STOP,
    // PATTERNS_MAX,
} from '../processor.js';
import {
    noteNumberToName,
    // contextConfigure,
    FONT_SIZE,
    // COLOR_FG_HIGHLIGHT,
    // COLOR_BG_HIGHLIGHT,
    COLOR_FG,
    COLOR_BG,
} from '../utilities.js';
// import {
//     getSelection,
//     getCursor,
//     scrollCheck
// } from './cursor.js';
// import {
//     dataGet,
//     lengthGet,
// } from './pattern.js';

//-- Constants -----------------------------------
export const CELL_WIDTH = 9;
export const DISPLAY_HEIGHT = 40;
export const WIDTH_LINE_NUMBER = 3;
const DISPLAY_CHAR_WIDTH = CELL_WIDTH*CHANNELS_NUMBER;
export const DISPLAY_PIXEL_WIDTH = (DISPLAY_CHAR_WIDTH+WIDTH_LINE_NUMBER)*FONT_SIZE;

//-- Pattern Grid --------------------------------
export function patternGridConstruct(data) {
    const patternGrid = new Array(data.length*CELL_WIDTH)
    //
    const rows = data.length / CHANNELS_NUMBER;
    for(let row = 0; row < rows; row++) {
        const offsetRow = row*CHANNELS_NUMBER;
        for(let channel = 0; channel < CHANNELS_NUMBER; channel++) {
            GridCellFill(patternGrid, row, channel, data[offsetRow+channel]);
        }
    }
    return patternGrid;
}
function GridCellFill(patternGrid, row, channel, dataCell) {
    const offsetX = channel*CELL_WIDTH;
    const offsetY = row;
    const [note, instrument, volume, effects] = cellParse(dataCell);
    // Place Note values
    if(note === undefined) {
        placeString(patternGrid, '···', offsetX, offsetY);
    } else if(channel === CHANNEL_NOISE && note !== MASK_CELL_NOTE_STOP) {
        placeString(patternGrid, '*'+note.toString(HEX).toUpperCase()+'*', offsetX, offsetY);
    } else {
        const noteName = noteNumberToName(note);
        placeString(patternGrid, noteName, offsetX, offsetY);
    }
    // Place Instrument values
    if(instrument === undefined) {
        placeString(patternGrid, '·', offsetX+3, offsetY);
    } else {
        placeString(patternGrid, instrument.toString(HEX).toUpperCase(), offsetX+3, offsetY);
    }
    // Place Volume values
    if(volume === undefined) {
        placeString(patternGrid, '··', offsetX+4, offsetY);
    } else {
        placeString(patternGrid, volume.toString(HEX).padStart(2,'0').toUpperCase(), offsetX+4, offsetY);
    }
    // Place Effect values
    if(effects === undefined) {
        placeString(patternGrid, '···', offsetX+6, offsetY);
    } else {
        placeString(patternGrid, effects.toString(HEX).padStart(3,'0').toUpperCase(), offsetX+6, offsetY);
    }
}
function placeString(patternGrid, string, posX, posY) {
    for(let indexChar = 0; indexChar < string.length; indexChar++) {
        placeChar(patternGrid, string[indexChar], posX+indexChar, posY);
    }
}
function placeChar(patternGrid, char, posX, posY) {
    const compoundIndex = posY*DISPLAY_CHAR_WIDTH+posX;
    patternGrid[compoundIndex] = char;
}

//-- Pattern Display -----------------------------
export function patternDisplay(context, patternGrid) {
    // if(drawWaiting) { return true;}
    // drawWaiting = true;
    // requestAnimationFrame(() => {
    //     drawPatternGrid(context);
    //    drawWaiting = false;
    // });
    // Ensure context changes don't bleed into other functions
    context.save();
    // Get pattern and interface state
    const rows = patternGrid.length / (CELL_WIDTH*CHANNELS_NUMBER);
    // const selection = getSelection();
    // const cursor = getCursor();
    const scrollY = 0;//getScroll();
    // Draw character grid (the whole big deal)
    context.fillStyle = COLOR_BG;
    context.fillRect(0,0,context.canvas.width, context.canvas.height);
    for(let row = scrollY; row < rows; row++) {
        let background = (row%2)? COLOR_BG : '#222';
        drawString(context, 
            row.toString(HEX).padStart(2,'0')+' ',
            0, row-scrollY,
            '#888', background,
        );
        // if(cursor && row === cursor.posY && !selection) {
        //     background = '#606';
        // }
        for(let channel = 0; channel < CHANNELS_NUMBER; channel++) {
            const offsetChannel = channel*CELL_WIDTH;
            drawGridPos(context, patternGrid, offsetChannel+0, row, '#fff', background);
            drawGridPos(context, patternGrid, offsetChannel+1, row, '#fff', background);
            drawGridPos(context, patternGrid, offsetChannel+2, row, '#fff', background);
            drawGridPos(context, patternGrid, offsetChannel+3, row, '#f88', background);
            drawGridPos(context, patternGrid, offsetChannel+4, row, '#6bf', background);
            drawGridPos(context, patternGrid, offsetChannel+5, row, '#6bf', background);
            drawGridPos(context, patternGrid, offsetChannel+6, row, '#86f', background);
            drawGridPos(context, patternGrid, offsetChannel+7, row, '#86f', background);
            drawGridPos(context, patternGrid, offsetChannel+8, row, '#86f', background);
        }
    }
    // // Draw Selection box
    // if(selection) {
    //     const posYMax = Math.min(rows-1, selection.posEndY);
    //     for(let posY = selection.posStartY; posY <= posYMax; posY++) {
    //         for(let posX = selection.posStartX; posX <= selection.posEndX; posX++) {
    //             drawGridPos(context, posX, posY, COLOR_FG_HIGHLIGHT, COLOR_BG_HIGHLIGHT);
    //         }
    //     }
    // }
    // // Draw Cursor
    // if(cursor) {
    //     drawGridPos(context, cursor.posX, cursor.posY, COLOR_FG_HIGHLIGHT, COLOR_BG_HIGHLIGHT);
    //     drawString(context, 
    //         cursor.posY.toString(HEX).padStart(2,'0')+' ',
    //         0, cursor.posY-scrollY,
    //         COLOR_FG_HIGHLIGHT, COLOR_BG_HIGHLIGHT,
    //     );
    // }
    // Cleanup context
    context.restore();
}
function drawGridPos(context, patternGrid, posX, posY, color=COLOR_FG, background=COLOR_BG) {
    const compoundIndex = posY*DISPLAY_CHAR_WIDTH+posX;
    let scrollY = 0;//getScroll();
    posY -= scrollY;
    posX += WIDTH_LINE_NUMBER;
    drawChar(context, patternGrid[compoundIndex], posX, posY, color, background);
}
function drawString(context, string, posX, posY, color=COLOR_FG, background=COLOR_BG) {
    for(let indexChar = 0; indexChar < string.length; indexChar++) {
        drawChar(context, string[indexChar], posX+indexChar, posY, color, background);
    }
}
function drawChar(context, char, posX, posY, color=COLOR_FG, background=COLOR_BG) {
    if(posX < 0 || posX >= CELL_WIDTH*CHANNELS_NUMBER+WIDTH_LINE_NUMBER) { return;}
    // if(posY < 0 || posY >= lengthGet()) { return;}
    context.save();
    const fillX = posX*FONT_SIZE;
    const fillY = posY*FONT_SIZE;
    const textX = fillX;
    const textY = fillY+FONT_SIZE;
    context.fillStyle = background;
    context.fillRect(fillX, fillY, FONT_SIZE, FONT_SIZE);
    if(char === '·') {
        context.globalAlpha = 0.5;
    }
    context.fillStyle = color;
    context.fillText(char, textX, textY);
    context.restore();
}

// //-- Canvas Size ---------------------------------
// export function canvasHeightSet(heightNew) {
//     context.canvas.height = heightNew*FONT_SIZE;
//     heightCanvas = heightNew;
//     contextConfigure(context);
//     patternDisplay();
//     scrollCheck();
// }
// export function canvasHeightGet() {
//     return heightCanvas;
// }
