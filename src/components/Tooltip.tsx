import * as RadixTooltip from "@radix-ui/react-tooltip"
import { ReactNode, forwardRef } from "react"

type Props = {
  children: ReactNode,
  content: string | ReactNode
  side?: "top" | "right" | "bottom" | "left"
  type?: "controls"
  disabled?: boolean
}

const Tooltip = forwardRef<HTMLButtonElement|null, Props>(({
  children,
  content,
  side = "bottom",
  type = "",
  disabled = false,
  ...rest
}, ref) => {
  if(disabled) {
    return <>{children}</>
  }

  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild ref={ref} {...rest}>
          {children}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content className={`tooltip-content ${type}`} sideOffset={0} side={side}>
            {content}
            <RadixTooltip.Arrow className='tooltip-arrow' />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
})
Tooltip.displayName = "Tooltip"

export default Tooltip
