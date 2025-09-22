import React, { useState } from 'react';

interface PopupButtonProps {
  showTooltip: boolean;
  tooltipText: string;
  Icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
}

const PopupButton: React.FC<PopupButtonProps> = ({ showTooltip, tooltipText, Icon, onClick, disabled = false }) => {
  const [buttonClicked, setButtonClicked] = useState(false);
  const handleClick = () => {
    if (disabled) return;
    setButtonClicked(true);
    onClick();
  };
  return (
    <div
      className='lg:tooltip lg:tooltip-bottom'
      data-tip={!buttonClicked && showTooltip ? tooltipText : null}
    >
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`flex h-8 min-h-8 w-8 items-center justify-center p-0 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Icon />
      </button>
    </div>
  );
};

export default PopupButton;
