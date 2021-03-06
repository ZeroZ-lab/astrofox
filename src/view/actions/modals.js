import { createSlice } from '@reduxjs/toolkit';
import { uniqueId } from 'utils/crypto';

const initialState = [];

const modalStore = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    showModal: {
      reducer: (state, action) => {
        return state.concat(action.payload);
      },
      prepare: (component, modalProps, componentProps) => {
        return { payload: { id: uniqueId(), component, modalProps, componentProps } };
      },
    },
    closeModal: state => {
      if (state.length > 0) {
        return state.slice(0, state.length - 1);
      }
      return state;
    },
  },
});

export const { showModal, closeModal } = modalStore.actions;

export default modalStore.reducer;
