<script setup>
import { useFrame, useVideoConfig } from 'pellicule'
import AirportScene from './src/components/AirportScene.vue'
const frame = useFrame()
const { fps } = useVideoConfig()
</script>
<template><div class="video-root"><AirportScene :frame="frame" :fps="fps" /></div></template>
<style>
html,body,#app { margin:0; width:100%; height:100%; overflow:hidden; }
.video-root { width:100%; height:100%; background:#0d1c29; }
</style>
