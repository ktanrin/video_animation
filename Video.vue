<script setup>
import { useFrame, useVideoConfig } from 'pellicule'
import AirportScene from './src/components/AirportScene.vue'
const params=new URLSearchParams(location.search)
const direction=params.get('direction')==='03'?'03':'21'
const movement=params.get('movement')==='departure'?'departure':'arrival'
const frame = useFrame()
const { fps } = useVideoConfig()
</script>
<template><div class="video-root"><AirportScene :direction="direction" :movement="movement" :frame="frame" :fps="fps" /></div></template>
<style>
html,body,#app { margin:0; width:100%; height:100%; overflow:hidden; }
.video-root { width:100%; height:100%; background:#0d1c29; }
</style>
