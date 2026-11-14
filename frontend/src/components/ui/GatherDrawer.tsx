'use client';
import {
  cloneElement,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { GatherButton } from './GatherButton';
import { GatherIcon } from './GatherIcon';
export function GatherDrawer({
  trigger,
  title,
  description,
  children,
  footer,
}: {
  trigger: ReactElement<ComponentProps<'button'>>;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => dialog.current?.close();
  return (
    <>
      {cloneElement(trigger, {
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        'aria-controls': id,
        onClick: (event) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) {
            dialog.current?.showModal();
            setOpen(true);
          }
        },
      })}
      <dialog
        ref={dialog}
        id={id}
        className="modal modal-end"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="modal-box gather-drawer">
          <div className="drawer-header">
            <div>
              <h2 className="card-title" id={`${id}-title`}>
                {title}
              </h2>
              <p id={`${id}-description`}>{description}</p>
            </div>
            <GatherButton
              type="button"
              variant="secondary"
              className="btn-square"
              aria-label={`Close ${title.toLowerCase()}`}
              onClick={close}
              autoFocus
            >
              <GatherIcon name="close" />
            </GatherButton>
          </div>
          <div className="drawer-body">{children}</div>
          <div className="drawer-footer">
            {footer}
            <GatherButton type="button" onClick={close}>
              Done
            </GatherButton>
          </div>
        </div>
      </dialog>
    </>
  );
}
