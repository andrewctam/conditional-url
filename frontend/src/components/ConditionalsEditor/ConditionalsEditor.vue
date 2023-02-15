<script setup lang='ts'>
import ConditionalBlock from './ConditionalBlock.vue'
import draggable from 'vuedraggable'
import { Condition, Conditional } from '../../types'


const props = defineProps<{
    conditionals: Conditional[],
}>();

const emit = defineEmits<{
    (event: 'updateConditionals', conditionals: Conditional[]): void
}>();

const updateUrl = (i: number, url: string) => {
    const updated = props.conditionals.map((conditional, j) => {
        if (i == j) {
            conditional.url = url;
        }

        return conditional;
    })

    emit('updateConditionals', updated);
}

const newConditional = () => {
    const updated = [...props.conditionals, {
        url: "",
        and: true,
        conditions: []
    }]

    emit('updateConditionals', updated);
}


const deleteConditional = (i: number) => {
    if (props.conditionals.length == 1) 
        return;

    const updated = props.conditionals.filter((c, j) => {
        return j != i;
    })

    emit('updateConditionals', updated);
}

const addCondition = (i: number, condition: Condition) => {
    const updated = props.conditionals.map((conditional, j) => {
        if (i == j) {
            conditional.conditions.push(condition);
        }

        return conditional;
    })

    emit('updateConditionals', updated);
}

const removeCondition = (conditionalNum: number, conditionNum: number) => {
    const updated = props.conditionals.map((conditional, i) => {
        if (i == conditionalNum) {
            conditional.conditions.splice(conditionNum, 1);
        }

        return conditional;
    })

    emit('updateConditionals', updated);
}

const toggleAnd = (i: number) => {
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
    <draggable :model-value="props.conditionals" @update:modelValue="emit('updateConditionals', [...$event])" item-key="id">
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
                @updateUrl = "updateUrl"
                @addCondition = "addCondition"
                @removeCondition = "removeCondition"
                @toggleAnd = "toggleAnd"
            />
        </template>
    </draggable>

    <div @click = "newConditional" class = "mx-2 p-2 cursor-pointer text-center rounded bg-white/5 border border-black/20 text-green-100 hover:text-green-200 text-sm font-light hover:bg-black/30 select-none">
        Add Block
    </div>
</template>

