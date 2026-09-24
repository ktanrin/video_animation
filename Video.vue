<script setup>
import { useFrame, useVideoConfig } from 'pellicule'
import { computed } from 'vue'
import AirportScene from './src/components/AirportScene.vue'
import { getScenario } from './src/data/hiro.js'
const params=new URLSearchParams(location.search)
const selected=getScenario(params.get('scenario') || 'segregated', params.get('direction') || '21')
const frame = useFrame()
const { fps } = useVideoConfig()
const requestedSpeed = Number(params.get('speed') || 1)
const playbackSpeed = [.5, 1, 2, 4, 8].includes(requestedSpeed) ? requestedSpeed : 1
const scenarioFrame = computed(() => Math.min(frame.value * playbackSpeed, selected.duration * fps))
</script>
<template><div class="video-root"><AirportScene :direction="selected.direction" :scenario="selected.id" :frame="scenarioFrame" :fps="fps" /></div></template>
<style>
html,body,#app { margin:0; width:100%; height:100%; overflow:hidden; }
.video-root { width:100%; height:100%; background:#0d1c29; }
</style>
