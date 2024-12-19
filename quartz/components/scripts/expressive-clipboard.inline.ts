document.addEventListener("nav", () => {
    const buttons = document.querySelectorAll('.expressive-code .copy button[data-code]')

    buttons.forEach(button => {
        if (button instanceof HTMLButtonElement) {
            const source = (button.dataset.code || '')
                .replace(/\u007F/g, '\n')  // 匹配控制字符+DEL并替换为换行符
                .trim()
            const copiedText = button.dataset.copied || 'Copied!'

            const tooltip = document.createElement('div')
            tooltip.className = 'copy-tooltip'
            tooltip.textContent = copiedText
            button.closest('.expressive-code')?.prepend(tooltip)

            function onClick() {
                navigator.clipboard.writeText(source).then(
                    () => {
                        tooltip.classList.add('show')
                        setTimeout(() => {
                            tooltip.classList.remove('show')
                        }, 2000)
                    },
                    (error) => console.error(error),
                )
            }

            button.addEventListener("click", onClick)
            window.addCleanup(() => {
                button.removeEventListener("click", onClick)
                tooltip.remove()
            })
        }
    })
}) 