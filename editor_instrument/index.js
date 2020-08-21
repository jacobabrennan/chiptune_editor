

//==============================================================================

//-- Dependencies --------------------------------
import {
    EDITOR_PANE_INSTRUMENT,
    CONTROL_GROUP_EDITOR_SWAP,
    CONTROL_GROUP_INSTRUMENT_SELECT,
    CONTROL_GROUP_PLAYBACK,
    CONTROL_GROUP_PATTERN,
    EDITOR_PANE_PATTERN,
} from '../utilities.js';
import { paneAdd, paneGet } from '../pane/pane_editor.js';
import { groupRegister } from '../pane/pane_control.js';
import { setupControlInstrumentSelect } from './controls.js';
import { setup as setupCanvas, instrumentDraw } from './canvas.js';
import { canvasHeightSet } from '../editor_pattern/canvas.js';
import Adjuster from '../controls/adjuster.js';
import { instrumentGet } from './instrument.js';
import Button, { ButtonBar } from '../controls/button.js';
import Radio from '../controls/radio.js';

//-- Setup ---------------------------------------
export async function setup() {
    // Create Full instrument editor pane (both editor, plus controls)
    const paneInstrument = document.createElement('div');
    paneInstrument.id = 'pane_instrument';
    // Create control strip
    const instrumentControls = document.createElement('div');
    instrumentControls.id = 'instrument_controls';
    paneInstrument.append(instrumentControls);
    // Add Sustain type selector to control strip
    const sustype = new Radio(
        instrumentControls, 9,
        ['No Sus.', 'Loop', 'Sustain'],
        e => e
    );
    sustype.draw();
    sustype.element.style.alignSelf = 'flex-end'
    // Add node editing tools to control strip
    const nodeGroup = document.createElement('div');
    nodeGroup.style.display = 'flex';
    nodeGroup.style.flexDirection = 'column';
    let adjusterNodes = new Adjuster(nodeGroup, 'Nodes', 11, instrumentNodeCountSet);
    adjusterNodes.valueSet(5, true);
    adjusterNodes.draw();
    let adjusterSustain = new Adjuster(nodeGroup, 'Sustain', 11, instrumentNodeCountSet);
    adjusterSustain.valueSet(5, true);
    adjusterSustain.draw();
    instrumentControls.append(nodeGroup);
    // Add instrument editor canvas to full pane
    paneInstrument.append(await setupCanvas());
    // Register pane
    paneAdd(EDITOR_PANE_INSTRUMENT, paneInstrument, [
        CONTROL_GROUP_EDITOR_SWAP,
        CONTROL_GROUP_PLAYBACK,
        CONTROL_GROUP_PATTERN,
        CONTROL_GROUP_INSTRUMENT_SELECT,
    ]);
    // Register instrument selector control group
    const groupInstrumentSelect = await setupControlInstrumentSelect();
    groupRegister(CONTROL_GROUP_INSTRUMENT_SELECT, groupInstrumentSelect);
    // Return full editor pane
    return paneInstrument;
}
export function instrumentEditorShown() {
    let paneInstrument = paneGet(EDITOR_PANE_INSTRUMENT);
    let editorCanvas = paneGet(EDITOR_PANE_PATTERN);
    canvasHeightSet(20);
    paneInstrument.prepend(editorCanvas);
}

//------------------------------------------------
function instrumentNodeCountSet(countNew) {
    const instrument = instrumentGet();
    instrument.envelopeLengthSet(countNew);
    instrumentDraw();
    return instrument.envelopeLengthGet();
}