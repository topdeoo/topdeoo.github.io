let currentObserver: IntersectionObserver | null = null
let activeSection: string | null = null
let debounceTimeout: number | null = null

function createObserver() {
  if (currentObserver) {
    currentObserver.disconnect()
  }

  currentObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const slug = entry.target.id
      const tocLink = document.querySelector(`a[data-for="${slug}"]`)

      if (tocLink) {
        if (entry.isIntersecting) {
          // 移除其他高亮
          document.querySelectorAll('#toc-content a.in-view').forEach(el => {
            if (el !== tocLink) {
              el.classList.remove('in-view')
              el.classList.add('read')
            }
          })
          tocLink.classList.add('in-view')
          tocLink.classList.remove('read')
        }
      }
    })
  }, {
    threshold: 0.3, // 当元素30%可见时触发
    rootMargin: '-10% 0px -60% 0px' // 调整观察区域，减少快速滚动时的频繁触发
  })

  const headers = document.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")
  if (currentObserver) {
    headers.forEach((header) => currentObserver?.observe(header))
  }
}

function toggleToc(this: HTMLElement) {
  this.classList.toggle("collapsed")
  this.setAttribute(
    "aria-expanded",
    this.getAttribute("aria-expanded") === "true" ? "false" : "true",
  )
  const content = this.nextElementSibling as HTMLElement | undefined
  if (!content) return
  content.classList.toggle("collapsed")
}

function setupToc() {
  const toc = document.getElementById("toc")
  if (toc) {
    toc.addEventListener("click", toggleToc)
    window.addCleanup(() => toc.removeEventListener("click", toggleToc))
  }
}

function setupTocListeners() {
  // 为所有标题添加滚动边距
  document.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]").forEach(header => {
    header.style.scrollMarginTop = '100px'
  })

  const tocLinks = document.querySelectorAll('#toc-content a')
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const targetId = link.getAttribute('data-for')
      if (!targetId) return

      const targetElement = document.getElementById(targetId)
      if (targetElement) {
        // 移除其他高亮
        document.querySelectorAll('#toc-content a.in-view').forEach(el => {
          if (el !== link) {
            el.classList.remove('in-view')
            el.classList.add('read')
          }
        })

        // 高亮当前点击的链接
        link.classList.add('in-view')
        link.classList.remove('read')

        // 移除所有现有的动画类
        document.querySelectorAll('.target-animation').forEach(el => {
          el.classList.remove('target-animation')
        })

        // 添加高亮动画
        targetElement.classList.add('target-animation')

        // 平滑滚动到目标位置
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    })
  })
}

window.addEventListener("resize", setupToc)
document.addEventListener("nav", () => {
  setupToc()
  createObserver()
  setupTocListeners()
})