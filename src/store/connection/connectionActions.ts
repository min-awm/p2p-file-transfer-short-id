import {ConnectionActionType} from "./connectionTypes";
import {Dispatch} from "redux";
import {DataType, PeerConnection} from "../../helpers/peer";
import {message} from "antd";
import { addBlobUrl } from '../download/downloadSlice'

export const changeConnectionInput = (id: string) => ({
    type: ConnectionActionType.CONNECTION_INPUT_CHANGE, id
})

export const setLoading = (loading: boolean) => ({
    type: ConnectionActionType.CONNECTION_CONNECT_LOADING, loading
})
export const addConnectionList = (id: string) => ({
    type: ConnectionActionType.CONNECTION_LIST_ADD, id
})

export const removeConnectionList = (id: string) => ({
    type: ConnectionActionType.CONNECTION_LIST_REMOVE, id
})

export const selectItem = (id: string) => ({
    type: ConnectionActionType.CONNECTION_ITEM_SELECT, id
})

export const connectPeer: (peerId: string) => (dispatch: Dispatch) => Promise<void>
    = (peerId: string) => (async (dispatch) => {
    dispatch(setLoading(true))
    try {
        const prefixId = localStorage.getItem("prefix_id") || "any-your-string-";
        const id = `${prefixId}${peerId}`
        await PeerConnection.connectPeer(id)
        PeerConnection.onConnectionDisconnected(id, () => {
            message.info("Connection closed: " + id)
            dispatch(removeConnectionList(id))
        })
        PeerConnection.onConnectionReceiveData(id, (file) => {
            message.info("Receiving file " + file.fileName + " from " + id)
            if (file.dataType === DataType.FILE) {
                const blob = new Blob([file.file ?? ""], { type: file.fileType || "text/plain"});
                const blobUrl = URL.createObjectURL(blob);
                dispatch(addBlobUrl({blobUrl, name: file.fileName || "fileName"}))
            }
        })
        dispatch(addConnectionList(id))
    } catch (err) {
        console.log(err)
    } finally {
        dispatch(setLoading(false))
    }
})


