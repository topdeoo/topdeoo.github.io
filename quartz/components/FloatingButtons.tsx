import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/floatingButtons.scss"
// @ts-ignore
import script from "./scripts/floatingButtons.inline"
import { classNames } from "../util/lang"

interface FloatingButtonsOptions {
    position?: 'left' | 'right'
}

export default ((opts?: FloatingButtonsOptions) => {
    function FloatingButtons({ displayClass }: QuartzComponentProps) {
        const position = opts?.position || 'right'

        return (
            <div class={classNames(displayClass, "floating-buttons", `floating-${position}`)}>
                <div class="button-group">
                    <button
                        class="floating-button"
                        title="回到顶部"
                        data-action="scrollTop"
                    >
                        <span class="floating-button-tooltip">回到顶部</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button
                        class="floating-button"
                        title="滚动到底部"
                        data-action="scrollBottom"
                    >
                        <span class="floating-button-tooltip">滚动到底部</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <button
                        class="floating-button"
                        title="全局图谱"
                        data-action="graph"
                    >
                        <span class="floating-button-tooltip">全局图谱 ⌘ G</span>
                        <svg
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            x="0px"
                            y="0px"
                            viewBox="0 0 55 55"
                            fill="currentColor"
                            xmlSpace="preserve"
                        >
                            <path
                                d="M49,0c-3.309,0-6,2.691-6,6c0,1.035,0.263,2.009,0.726,2.86l-9.829,9.829C32.542,17.634,30.846,17,29,17
	s-3.542,0.634-4.898,1.688l-7.669-7.669C16.785,10.424,17,9.74,17,9c0-2.206-1.794-4-4-4S9,6.794,9,9s1.794,4,4,4
	c0.74,0,1.424-0.215,2.019-0.567l7.669,7.669C21.634,21.458,21,23.154,21,25s0.634,3.542,1.688,4.897L10.024,42.562
	C8.958,41.595,7.549,41,6,41c-3.309,0-6,2.691-6,6s2.691,6,6,6s6-2.691,6-6c0-1.035-0.263-2.009-0.726-2.86l12.829-12.829
	c1.106,0.86,2.44,1.436,3.898,1.619v10.16c-2.833,0.478-5,2.942-5,5.91c0,3.309,2.691,6,6,6s6-2.691,6-6c0-2.967-2.167-5.431-5-5.91
	v-10.16c1.458-0.183,2.792-0.759,3.898-1.619l7.669,7.669C41.215,39.576,41,40.26,41,41c0,2.206,1.794,4,4,4s4-1.794,4-4
	s-1.794-4-4-4c-0.74,0-1.424,0.215-2.019,0.567l-7.669-7.669C36.366,28.542,37,26.846,37,25s-0.634-3.542-1.688-4.897l9.665-9.665
	C46.042,11.405,47.451,12,49,12c3.309,0,6-2.691,6-6S52.309,0,49,0z M11,9c0-1.103,0.897-2,2-2s2,0.897,2,2s-0.897,2-2,2
	S11,10.103,11,9z M6,51c-2.206,0-4-1.794-4-4s1.794-4,4-4s4,1.794,4,4S8.206,51,6,51z M33,49c0,2.206-1.794,4-4,4s-4-1.794-4-4
	s1.794-4,4-4S33,46.794,33,49z M29,31c-3.309,0-6-2.691-6-6s2.691-6,6-6s6,2.691,6,6S32.309,31,29,31z M47,41c0,1.103-0.897,2-2,2
	s-2-0.897-2-2s0.897-2,2-2S47,39.897,47,41z M49,10c-2.206,0-4-1.794-4-4s1.794-4,4-4s4,1.794,4,4S51.206,10,49,10z"
                            />
                        </svg>
                    </button>
                    <button
                        class="floating-button"
                        title="快捷键"
                        data-action="shortcuts"
                    >
                        <span class="floating-button-tooltip">快捷键</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20">
                            <path fill="currentColor" d="M5 12.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m6.502-4.495a.752.752 0 1 0 0-1.505a.752.752 0 0 0 0 1.505m3.753-.753a.752.752 0 1 1-1.505 0a.752.752 0 0 1 1.505 0m-9.753.753a.752.752 0 1 0 0-1.505a.752.752 0 0 0 0 1.505M7.75 9.752a.752.752 0 1 1-1.505 0a.752.752 0 0 1 1.505 0m2.252.753a.752.752 0 1 0 0-1.505a.752.752 0 0 0 0 1.505m3.757-.753a.752.752 0 1 1-1.504 0a.752.752 0 0 1 1.504 0M8.503 8.005a.752.752 0 1 0 0-1.505a.752.752 0 0 0 0 1.505M2 5.5A1.5 1.5 0 0 1 3.5 4h13A1.5 1.5 0 0 1 18 5.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 13.5zM3.5 5a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5z" />
                        </svg>
                    </button>
                </div>
            </div>
        )
    }

    FloatingButtons.css = style
    FloatingButtons.afterDOMLoaded = script
    return FloatingButtons
}) satisfies QuartzComponentConstructor