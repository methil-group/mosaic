export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('tooltip', {
    mounted(el, binding) {
      if (!binding.value) return
      el.setAttribute('title', binding.value)
    },
    updated(el, binding) {
      if (binding.value) {
        el.setAttribute('title', binding.value)
      } else {
        el.removeAttribute('title')
      }
    }
  })
})
