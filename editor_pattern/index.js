

//==============================================================================

//-- Dependencies --------------------------------
import Vue from '/libraries/vue.esm.browser.js';
import {
    CHANNELS_NUMBER,
    PATTERN_LENGTH_MAX,
} from '/libraries/apu.single.js';
import { EVENT_ADJUST } from '../base_components/index.js';
import './canvas.js';
import {
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseLeave,
    handleWheel,
    handleKeyDown,
    parseInputDelete,
    parseNoteInput,
    parseNoiseInput,
    parseCellInput,
    commandCopy,
    commandPaste,
} from './input.js';
import {
    setup as setupCanvas,
    patternDisplay,
    patternGridConstruct,
} from './canvas.js';
import {
    cursorPosition,
    cursorSelect,
    cursorHighlight,
    cursorMove,
    scrollBy,
    scrollTo,
    scrollCheck,
} from './cursor.js';
import {
    contextConfigure,
    FONT_SIZE,
} from '../utilities.js';
import {
    cellGet,
    cellEdit,
    cellEditNote,
    cellEditInstrument,
    cellEditVolume,
    cellEditEffects,
} from './pattern.js';

//------------------------------------------------
Vue.component('editor-pattern', {
    template: (`
        <div class="pattern_display">
            <div class="controls_bar">
                <div class="manager_buttons">
                    <button @click="$emit('new')">New</button>
                    <button @click="$emit('delete')">Del</button>
                </div>
                <input
                    type="text"
                    :value="pattern.name"
                    maxlength="14"
                    @change="handlePatternName"
                />
                <value-adjuster
                    label="Length"
                    :width="12"
                    :value="pattern.data.length / ${CHANNELS_NUMBER}"
                    :min="1"
                    :max="${PATTERN_LENGTH_MAX}"
                    @${EVENT_ADJUST}="$emit('adjustlength', $event)"
                    style="border: solid black 2px; padding-bottom: 2px; background: black;"
                />
            </div>
            <canvas
                ref="canvas"
                @mousedown = "handleMouseDown"
                @mouseup = "handleMouseUp"
                @mousemove = "handleMouseMove"
                @mouseleave = "handleMouseLeave"
                @wheel = "handleWheel"
                @keydown = "handleKeyDown"
            />
        </div>
    `),
    props: {
        pattern: {
            type: Object,
            required: true,
        },
        height: {
            type: Number,
            required: true,
        },
        instrument: {
            type: Number,
            require: true,
        },
        highlightRow: Number,
    },
    data() {
        return {
            patternGrid: null,
            cursor: {
                posX: 0,
                posY: 0,
            },
            selection: null,
            scrollY: 0,
        };
    },
    methods: {
        // Interaction Handles
        handleMouseDown: handleMouseDown,
        handleMouseUp: handleMouseUp,
        handleMouseMove: handleMouseMove,
        handleMouseLeave: handleMouseLeave,
        handleWheel: handleWheel,
        handleKeyDown: handleKeyDown,
        // Cursor / Selection positioning
        cursorPosition: cursorPosition,
        cursorSelect: cursorSelect,
        cursorHighlight: cursorHighlight,
        cursorMove: cursorMove,
        // Scrolling
        scrollBy: scrollBy,
        scrollTo: scrollTo,
        scrollCheck: scrollCheck,
        // Input Parsing
        parseInputDelete: parseInputDelete,
        parseNoteInput: parseNoteInput,
        parseNoiseInput: parseNoiseInput,
        parseCellInput: parseCellInput,
        // Pattern Editing
        cellGet: cellGet,
        cellEdit: cellEdit,
        cellEditNote: cellEditNote,
        cellEditInstrument: cellEditInstrument,
        cellEditVolume: cellEditVolume,
        cellEditEffects: cellEditEffects,
        // Copying, Cut, Paste
        commandCopy: commandCopy,
        commandPaste: commandPaste,
        // Drawing
        draw() {
            if(this.drawWaiting) { return true;}
            this.drawWaiting = true;
            requestAnimationFrame(() => {
                patternDisplay(
                    this.context,
                    this.patternGrid,
                    this.cursor,
                    this.selection,
                    this.scrollY
                );
                this.drawWaiting = false;
            });
        },
        handlePatternName(eventChange) {
            const nameNew = eventChange.target.value;
            this.pattern.name = nameNew;
        },
    },
    mounted() {
        this.context = setupCanvas(this.$refs.canvas, this.height);
        this.patternGrid = patternGridConstruct(this.pattern.data);
    },
    watch: {
        scrollY: 'draw',
        patternGrid: 'draw',
        selection: 'draw',
        cursor: function(valueNew) {
            if(!valueNew) {
                this.draw();
                return;
            }
            if(valueNew.posY < this.scrollY) {
                this.scrollY = valueNew.posY;
                this.draw();
                return;
            }
            if(valueNew.posY > (this.height-1) + this.scrollY) {
                this.scrollY = valueNew.posY - (this.height-1);
                this.draw();
                return;
            }
            this.draw();
        },
        highlightRow: function (valueNew) {
            if(!Number.isFinite(valueNew)) { return;}
            this.cursorPosition(
                this.cursor? this.cursor.posX : 0,
                valueNew,
            );
        },
        pattern: {
            deep: true,
            handler: function (valueNew) {
                this.patternGrid = patternGridConstruct(valueNew.data);
                const rows = valueNew.length / CHANNELS_NUMBER;
                if(this.cursor && this.cursor.posY >= rows) {
                    this.cursor = {
                        posX: this.cursor.posX,
                        posY: 0,
                    };
                }
            },
        },
        height: function (valueNew) {
            this.context.canvas.height = valueNew*FONT_SIZE;
            contextConfigure(this.context);
            this.scrollCheck();
            this.draw();
        },
    }
});
