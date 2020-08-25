

//==============================================================================

//-- Dependencies --------------------------------
import { DISPLAY_PIXEL_WIDTH } from '../editor_pattern/canvas.js';
import {
    groupHideAll,
    groupShow,
    groupRegister,
} from './pane_control.js';
import {
    EDITOR_PANE_PATTERN,
    EDITOR_PANE_INSTRUMENT,
    CONTROL_GROUP_EDITOR_SWAP,
} from '../utilities.js';
import Button, { ButtonBar } from '../controls/button.js';
import { patternEditorShown } from '../editor_pattern/index.js';
import { instrumentEditorShown } from '../editor_instrument/index.js';
import { instrumentListUpdate } from '../editor_instrument/controls.js';
import { instrumentGet, instrumentSelect } from '../editor_instrument/instrument.js';
import { controlStripUpdate } from '../editor_instrument/control_strip.js';
import { instrumentDraw } from '../editor_instrument/canvas.js';

//-- Module State --------------------------------
let editor;
const panes = {};
const paneControlGroups = {};
let idPaneCurrent;

//-- Setup ---------------------------------------
export async function setup() {
    // Create DOM container
    editor = document.createElement('div');
    editor.id = 'editor';
    editor.style.width = `${DISPLAY_PIXEL_WIDTH}px`;
    // Register pane controls
    const controls = await setupControls();
    groupRegister(CONTROL_GROUP_EDITOR_SWAP, controls);
    // Return DOM container
    return editor;
}

//------------------------------------------------
export function paneSelect(idPane) {
    // Hide old pane
    const paneOld = panes[idPaneCurrent];
    if(paneOld) {
        paneOld.remove();
        idPaneCurrent = undefined;
    }
    groupHideAll();
    // Show new pane
    const paneNew = panes[idPane];
    if(!paneNew) { return;}
    idPaneCurrent = idPane;
    editor.append(paneNew);
    // Show associated control groups
    const controlGroupsNew = paneControlGroups[idPane];
    for(let idGroup of controlGroupsNew) {
        groupShow(idGroup);
    }
}
export function paneAdd(idPane, elementPane, controlGroups) {
    panes[idPane] = elementPane;
    paneControlGroups[idPane] = controlGroups;
}
export function paneGet(idPane) {
    return panes[idPane];
}


//== Controls ==================================================================

//-- Module State --------------------------------
let instrumenteditorVisible = false;
let instToggle;

//-- Setup ---------------------------------------
export async function setupControls() {
    const controlGroup = document.createElement('div');
    controlGroup.className = 'control_group';
    instToggle = new Button(controlGroup, 'EditInstrument', () => {
        if(instrumenteditorVisible) {
            closeInstrumentEditor();
        }
        else {
            instrumentListUpdate();
            controlStripUpdate();
            instrumentDraw();
            instrumenteditorVisible = true;
            instToggle.element.classList.add('selected');
            paneSelect(EDITOR_PANE_INSTRUMENT);
            instrumentEditorShown();
        }
    });
    return controlGroup;
}

//------------------------------------------------
export function closeInstrumentEditor() {
    if(instrumenteditorVisible) {
        instrumenteditorVisible = false;
        instToggle.element.classList.remove('selected');
        paneSelect(EDITOR_PANE_PATTERN);
        patternEditorShown();
        instrumentListUpdate()
    }
}
