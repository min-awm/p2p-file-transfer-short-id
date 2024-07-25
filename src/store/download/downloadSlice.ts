import { createSlice } from '@reduxjs/toolkit'
import { DownloadState } from "./downloadTypes";


const initialState: DownloadState = {
    files: [],
}

export const downloadSlice = createSlice({
    name: 'download',
    initialState,
    reducers: {
        addBlobUrl: (state, action) => {
            state.files.push(action.payload)
        },
    },
})

export const { addBlobUrl } = downloadSlice.actions

export default downloadSlice.reducer