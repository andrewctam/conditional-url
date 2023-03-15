<script setup lang='ts'>
import { ref } from 'vue'
import ConditionalBlock from './ConditionalBlock.vue'
import draggable from 'vuedraggable'
import { Condition, Conditional } from '../../types'


const props = defineProps<{
    conditionals: Conditional[],
}>();

const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);

const undo = () => {
    if (undoStack.value.length < 1)
        return;
    
    redoStack.value.push(JSON.stringify(props.conditionals))

    const top = undoStack.value.pop();
    if (top)
        emit('updateConditionals', JSON.parse(top));
}

const redo = () => {
    if (redoStack.value.length < 1)
        return;
    
    undoStack.value.push(JSON.stringify(props.conditionals))

    const top = redoStack.value.pop();
    if (top)
        emit('updateConditionals', JSON.parse(top));
}

const addToUndo = () => {
    redoStack.value = [];
    undoStack.value.push(JSON.stringify(props.conditionals))
}

const emit = defineEmits<{
    (event: 'updateConditionals', conditionals: Conditional[]): void
}>();

const updateURL = (i: number, url: string) => {
    addToUndo();
    const updated = props.conditionals.map((conditional, j) => {
        if (i == j) {
            conditional.url = url;
        }

        return conditional;
    })

    emit('updateConditionals', updated);
}

const newConditional = () => {
    addToUndo();
    const updated = [...props.conditionals, {
        url: "",
        and: true,
        conditions: []
    }]

    emit('updateConditionals', updated);
}


const deleteConditional = (i: number) => {
    addToUndo();
    if (props.conditionals.length == 1) 
        return;

    const updated = props.conditionals.filter((c, j) => {
        return j != i;
    })

    emit('updateConditionals', updated);
}

const addCondition = (i: number, condition: Condition) => {
    addToUndo();
    const updated = props.conditionals.map((conditional, j) => {
        if (i == j) {
            conditional.conditions.push(condition);
        }

        return conditional;
    })

    emit('updateConditionals', updated);
}

const removeCondition = (conditionalNum: number, conditionNum: number) => {
    addToUndo();
    const updated = props.conditionals.map((conditional, i) => {
        if (i == conditionalNum) {
            conditional.conditions.splice(conditionNum, 1);
        }

        return conditional;
    })

    emit('updateConditionals', updated);
}

const toggleAnd = (i: number) => {
    addToUndo();
    const updated = props.conditionals.map((conditional, j) => {
        if (i == j) {
            conditional.and = !conditional.and;
        }

        return conditional;
    })

    emit('updateConditionals', updated);
}



</script>

<template>
    <div class="relative pt-8">
        <draggable 
        handle=".handle"
        :model-value="props.conditionals" 
        @update:modelValue="(event) => {
            addToUndo();
            emit('updateConditionals', [...event])
        }
        " 
        item-key="id">
            <template #item="{element, index}">
                <ConditionalBlock
                    :key = "index"
                    :i = "index"
                    :and= " element.and"
                    :first = "index === 0"
                    :last = "index === conditionals.length - 1"
                    :conditions="element.conditions"
                    :url="element.url"
                    :redirects="element.redirects"
                    @delete = "deleteConditional"
                    @updateURL = "updateURL"
                    @addCondition = "addCondition"
                    @removeCondition = "removeCondition"
                    @toggleAnd = "toggleAnd"
                />
            </template>
        </draggable>

        <div v-if="conditionals.length < 100" @click = "newConditional" class = "mx-2 p-2 cursor-pointer text-center rounded bg-white/5 border border-black/20 text-green-100 hover:text-green-200 text-sm font-light hover:bg-black/30 select-none">
            Add Block
        </div>

        <div class = "absolute top-0 right-2">
            <button @click="undo" :disabled = "undoStack.length < 1" class="p-1 text-white text-2xl disabled:text-gray-500"> 
                ⟲
            </button>
            <button @click="redo" :disabled = "redoStack.length < 1" class="p-1 text-white text-2xl disabled:text-gray-500 ml-4 md:ml-1"> 
                ⟳
            </button>
        </div>
    </div>
</template>

