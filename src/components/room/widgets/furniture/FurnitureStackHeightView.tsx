import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { AirButton, AirCheckbox, AirFrame, AirInputSurface, AirSlider } from '../../../../common/air/AirWindow';
import { DraggableWindow } from '../../../../common/draggable-window';
import { useFurnitureStackHeightWidget } from '../../../../hooks/rooms/widgets/furniture/useFurnitureStackHeightWidget';
import './FurnitureStackHeightView.css';

export const FurnitureStackHeightView: FC = () => {
    const {
        objectId,
        inputValue,
        height,
        sliderPosition,
        isWalkHeightHelper,
        multiWalk,
        onClose,
        selectSlider,
        beginSliderDrag,
        endSliderDrag,
        changeInput,
        commitInput,
        blurInput,
        performAction,
        toggleMultiWalk
    } = useFurnitureStackHeightWidget();
    const mode = isWalkHeightHelper ? 'walk' : 'stack';
    const title = LocalizeText(`widget.custom.${mode}.height.title`);
    const description = LocalizeText(`widget.custom.${mode}.height.text`);

    if (objectId === -1) return null;

    return (
        <DraggableWindow handleSelector=".air-frame__titlebar" uniqueKey="custom-stack-height">
            <AirFrame className={`furniture-stack-height furniture-stack-height--${mode}`} title={title} onClose={onClose}>
                <AirButton className="furniture-stack-height__above" name="button_above_stack" onClick={() => performAction('above')}>
                    {LocalizeText('furniture.above.stack')}
                </AirButton>
                <AirButton className="furniture-stack-height__floor" name="button_floor_level" onClick={() => performAction('floor')}>
                    {LocalizeText('furniture.floor.level')}
                </AirButton>
                <div className="furniture-stack-height__slider">
                    <AirSlider
                        label={description}
                        maximum={10}
                        width={206}
                        position={sliderPosition}
                        value={height}
                        onDragEnd={endSliderDrag}
                        onDragStart={beginSliderDrag}
                        onSelect={selectSlider}
                    />
                </div>
                <p className="furniture-stack-height__text" data-air-name="height_text">
                    {description}
                </p>
                <AirInputSurface className="furniture-stack-height__input-border">
                    <input
                        aria-label={title}
                        autoComplete="off"
                        inputMode="decimal"
                        name="input_height"
                        type="text"
                        value={inputValue}
                        onBlur={blurInput}
                        onChange={(event) => changeInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                commitInput();
                            }
                        }}
                    />
                </AirInputSurface>
                {isWalkHeightHelper && (
                    <label className="furniture-stack-height__walk" data-air-name="walktile_container">
                        <AirCheckbox
                            aria-label={LocalizeText('widget.custom.multiwalk_mode.text')}
                            checked={multiWalk}
                            name="multiwalk_checkbox"
                            onChange={(event) => toggleMultiWalk(event.target.checked)}
                        />
                        <span>{LocalizeText('widget.custom.multiwalk_mode.text')}</span>
                    </label>
                )}
                <AirButton
                    aria-label={LocalizeText('widget.custom.height.move_down')}
                    className="furniture-stack-height__step furniture-stack-height__step--down"
                    name="button_move_down"
                    title={LocalizeText('widget.custom.height.move_down')}
                    onClick={() => performAction('down')}
                >
                    <i aria-hidden="true" />
                </AirButton>
                <AirButton
                    aria-label={LocalizeText('widget.custom.height.move_up')}
                    className="furniture-stack-height__step furniture-stack-height__step--up"
                    name="button_move_up"
                    title={LocalizeText('widget.custom.height.move_up')}
                    onClick={() => performAction('up')}
                >
                    <i aria-hidden="true" />
                </AirButton>
            </AirFrame>
        </DraggableWindow>
    );
};
