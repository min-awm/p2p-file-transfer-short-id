import Peer, {DataConnection, PeerErrorType, PeerError} from "peerjs";
import {message} from "antd";

export enum DataType {
    FILE = 'FILE',
    OTHER = 'OTHER'

}
export interface Data {
    dataType: DataType
    file?: Blob
    fileName?: string
    fileType?: string
    message?: string
}

let peer: Peer | undefined
let connectionMap: Map<string, DataConnection> = new Map<string, DataConnection>()

export const PeerConnection = {
    getPeer: () => peer,
    startPeerSession: (randomId = 0) => new Promise<string>((resolve, reject) => {
        const startSession = (currentId: number) => {
            try {
                const prefixId = localStorage.getItem("prefix_id") || "any-your-string-";
                const peerId = currentId || Math.floor(Math.random() * 101);
                peer = new Peer(`${prefixId}${peerId}`);

                peer.on('open', (id) => {
                    console.log('My ID: ' + id);
                    resolve(id);
                });

                peer.on('error', (err) => {
                    console.log(err);
                    message.error(err.message);

                    if (err.type === "unavailable-id") {
                        startSession(peerId + 1)
                    } 
                });
            } catch (err) {
                console.log(err);
                reject(err);
            }
        };

        return startSession(randomId);
    }),
    closePeerSession: () => new Promise<void>((resolve, reject) => {
        try {
            if (peer) {
                peer.destroy()
                peer = undefined
            }
            resolve()
        } catch (err) {
            console.log(err)
            reject(err)
        }
    }),
    connectPeer: (id: string) => new Promise<void>((resolve, reject) => {
        if (!peer) {
            reject(new Error("Peer doesn't start yet"))
            return
        }
        if (connectionMap.has(id)) {
            reject(new Error("Connection existed"))
            return
        }
        try {
            let conn = peer.connect(id, {reliable: true})
            if (!conn) {
                reject(new Error("Connection can't be established"))
            } else {
                conn.on('open', function() {
                    console.log("Connect to: " + id)
                    connectionMap.set(id, conn)
                    peer?.removeListener('error', handlePeerError)
                    resolve()
                }).on('error', function(err) {
                    console.log(err)
                    peer?.removeListener('error', handlePeerError)
                    reject(err)
                })

                // When the connection fails due to expiry, the error gets emmitted
                // to the peer instead of to the connection.
                // We need to handle this here to be able to fulfill the Promise.
                const handlePeerError = (err: PeerError<`${PeerErrorType}`>) => {
                    if (err.type === 'peer-unavailable') {
                        const messageSplit = err.message.split(' ')
                        const peerId = messageSplit[messageSplit.length - 1]
                        if (id === peerId) reject(err)
                    }
                }
                peer.on('error', handlePeerError);
            }
        } catch (err) {
            reject(err)
        }
    }),
    onIncomingConnection: (callback: (conn: DataConnection) => void) => {
        peer?.on('connection', function (conn) {
            console.log("Incoming connection: " + conn.peer)
            connectionMap.set(conn.peer, conn)
            callback(conn)
        });
    },
    onConnectionDisconnected: (id: string, callback: () => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet")
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist")
        }
        let conn = connectionMap.get(id);
        if (conn) {
            conn.on('close', function () {
                console.log("Connection closed: " + id)
                connectionMap.delete(id)
                callback()
            });
        }
    },
    sendConnection: (id: string, data: Data): Promise<void> => new Promise((resolve, reject) => {
        if (!connectionMap.has(id)) {
            reject(new Error("Connection didn't exist"))
        }
        try {
            let conn = connectionMap.get(id);
            if (conn) {
                conn.send(data)
            }
        } catch (err) {
            reject(err)
        }
        resolve()
    }),
    onConnectionReceiveData: (id: string, callback: (f: Data) => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet")
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist")
        }
        let conn = connectionMap.get(id)
        if (conn) {
            conn.on('data', function (receivedData) {
                console.log("Receiving data from " + id)
                let data = receivedData as Data
                callback(data)
            })
        }
    }

}