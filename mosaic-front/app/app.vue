<template>
  <div class="h-screen overflow-hidden">
    <AgentInterface />
  </div>
</template>

<style>
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

body {
  margin: 0;
  padding: 0;
  background: #0a0a0c;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
</style>
