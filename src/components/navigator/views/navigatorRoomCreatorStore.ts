import { createOctaneStore } from '../../../state/createOctaneStore';

interface RoomCreatorForm {
    name: string;
    nameTouched: boolean;
    description: string;
    descriptionTouched: boolean;
    categoryIndex: number;
    visitorsIndex: number;
    tradeIndex: number;
    nameError: string | null;
    nameInvalid: boolean;
    selectedModelName: string;
}

const initialForm: RoomCreatorForm = {
    name: '',
    nameTouched: false,
    description: '',
    descriptionTouched: false,
    categoryIndex: 0,
    visitorsIndex: 0,
    tradeIndex: 0,
    nameError: null,
    nameInvalid: false,
    selectedModelName: 'a'
};

interface RoomCreatorState extends RoomCreatorForm {
    position: { x: number; y: number } | null;
    showVersion: number;
    prepareForShow: () => void;
    setForm: (patch: Partial<RoomCreatorForm>) => void;
    setPosition: (position: { x: number; y: number }) => void;
}

export const useRoomCreatorStore = createOctaneStore<RoomCreatorState>()((set) => ({
    ...initialForm,
    position: null,
    showVersion: 0,
    prepareForShow: () => {
        const initialPosition = {
            x: Math.trunc((window.innerWidth - 585) / 2),
            y: Math.trunc((window.innerHeight - 367) / 2)
        };
        set((state) => ({ ...initialForm, position: state.position ?? initialPosition, showVersion: state.showVersion + 1 }));
    },
    setForm: (patch) => set(patch),
    setPosition: (position) => set((state) => state.position?.x === position.x && state.position?.y === position.y ? state : { position })
}));
