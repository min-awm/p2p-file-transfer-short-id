import React, { useEffect, useMemo } from 'react';
import {Button, Card, Col, Input, Menu, MenuProps, message, Row, Space, Typography, Upload, UploadFile, List} from "antd";
import {CopyOutlined, UploadOutlined, DownloadOutlined} from "@ant-design/icons";
import {useAppDispatch, useAppSelector} from "./store/hooks";
import {startPeer, stopPeerSession} from "./store/peer/peerActions";
import * as connectionAction from "./store/connection/connectionActions"
import {DataType, PeerConnection} from "./helpers/peer";
import {useAsyncState} from "./helpers/hooks";
import JSZip from 'jszip';
import jsFileDownload from "js-file-download";

const {Title} = Typography
type MenuItem = Required<MenuProps>['items'][number]

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
    type?: 'group',
): MenuItem {
    return {
        key,
        icon,
        children,
        label,
        type,
    } as MenuItem;
}

export const App: React.FC = () => {

    const peer = useAppSelector((state) => state.peer)
    const connection = useAppSelector((state) => state.connection)
    const download = useAppSelector((state) => state.download)
    const [prefixId, setPrefixId] = useAsyncState(localStorage.getItem("prefix_id") || "any-your-string-")
    const peerId = useMemo(() => {
        return peer?.id?.replace(prefixId, "")
      }, [peer.id]);
    
    const dispatch = useAppDispatch()

    const handleStartSession = () => {
        dispatch(startPeer())
    }

    useEffect(() => {
        handleStartSession()
     
        // eslint-disable-next-line
    }, []);



    const handleStopSession = async () => {
        await PeerConnection.closePeerSession()
        dispatch(stopPeerSession())
    }

    const handleConnectOtherPeer = () => {
        connection.id != null ? dispatch(connectionAction.connectPeer(connection.id || "")) : message.warning("Please enter ID")
    }

    const [fileList, setFileList] = useAsyncState([] as UploadFile[])
    const [sendLoading, setSendLoading] = useAsyncState(false)

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning("Please select file")
            return
        }
        if (!connection.selectedId) {
            message.warning("Please select a connection")
            return
        }
        try {
            await setSendLoading(true);
            for (const file of fileList) {
                let blob = new Blob([file], {type: file.type});
                await PeerConnection.sendConnection(connection.selectedId, {
                    dataType: DataType.FILE,
                    file: blob,
                    fileName: file.name,
                    fileType: file.type
                })

                message.info(`Send ${file.name} successfully`)
            }
         
            await setSendLoading(false)
        } catch (err) {
            await setSendLoading(false)
            console.log(err)
            message.error("Error when sending file")
        }
    }

    const downloadAllFn = async () => {
        const zip = new JSZip();
        
        for (const file of download.files) {
            let blob = await fetch(file.blobUrl).then(r => r.blob());
            zip.file(file.name, blob)
        }

        try {
            const content = await zip.generateAsync({ type: "blob" });

            // Generate name zip
            const timeNow = new Date();
            const year = timeNow.getFullYear();
            const month = String(timeNow.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const day = String(timeNow.getDate()).padStart(2, '0');
            const hours = String(timeNow.getHours()).padStart(2, '0');
            const minutes = String(timeNow.getMinutes()).padStart(2, '0');
            const seconds = String(timeNow.getSeconds()).padStart(2, '0');

            const nameZip = `a_${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
            jsFileDownload(content, nameZip);
        } catch (error) {
            console.error("Error generating ZIP file:", error);
        }
    }

    const savePrefixId = () => {
        if(prefixId) {
            localStorage.setItem('prefix_id', prefixId)
            message.success("Save key")
        }
    }

    return (
        <Row justify={"center"} align={"top"}>
            <Col xs={24} sm={24} md={20} lg={16} xl={12}>
                <Card>
                    <a href="https://github.com/min-awm/p2p-file-transfer-short-id" target="_blank" rel="noopener noreferrer">
                        Github
                    </a>
                    <Title level={2} style={{textAlign: "center"}}>P2P File Transfer</Title>
                        <Card hidden={peer.started}>
                            <Button onClick={handleStartSession} loading={peer.loading}>Start</Button>
                        </Card>
                       
                        <div hidden={!peer.started}>
                            <Card>
                                <Space direction="horizontal">
                                    Key: 
                                    <Space direction="horizontal">
                                    <Input placeholder={"Any your string"}
                                           value={prefixId}
                                           onChange={e => setPrefixId(e.target.value)}
                                           required={true}
                                           />
                                    <Button onClick={savePrefixId}>Save</Button>
                                </Space>
                                </Space>
                            </Card>
                            <Card>
                                <Space direction="horizontal">                                        
                                    ID: {peerId}
                                    <Button icon={<CopyOutlined/>} onClick={async () => {
                                        await navigator.clipboard.writeText(peerId || "")
                                        message.info("Copied: " + peerId)
                                    }}/>
                                    <Button danger onClick={handleStopSession}>Stop</Button>
                                </Space>
                            </Card>
                            <Card>
                                <Space direction="horizontal">
                                    <Input placeholder={"ID"}
                                           onChange={e => dispatch(connectionAction.changeConnectionInput(e.target.value))}
                                           required={true}
                                           />
                                    <Button onClick={handleConnectOtherPeer}
                                            loading={connection.loading}>Connect</Button>
                                </Space>
                            </Card>

                            <Card title="Connection">
                                {
                                    connection.list.length === 0
                                        ? <div>Waiting for connection ...</div>
                                        : <div>
                                            Select a connection
                                            <Menu selectedKeys={connection.selectedId ? [connection.selectedId] : []}
                                                  onSelect={(item) => dispatch(connectionAction.selectItem(item.key))}
                                                  items={connection.list.map(e => getItem(e, e, null))}/>
                                        </div>
                                }

                            </Card>
                            <Card title="Send File">
                                <Upload fileList={fileList}
                                        multiple={true}
                                        onRemove={(file) => {
                                            const fileListRemoved = fileList.filter((item: UploadFile) => item.uid !== file.uid)
                                            setFileList(fileListRemoved)
                                        }}
                                        beforeUpload={(file) => {
                                            setFileList((fileList: UploadFile[]) => ([...fileList, file]))
                                            return false
                                        }}>
                                    <Button icon={<UploadOutlined/>}>Select File</Button>
                                </Upload>
                                <Button
                                    type="primary"
                                    onClick={handleUpload}
                                    disabled={fileList.length === 0}
                                    loading={sendLoading}
                                    style={{marginTop: 16}}
                                >
                                    {sendLoading ? 'Sending' : 'Send'}
                                </Button>
                            </Card>

                            <div hidden={!download.files.length}>
                                <List
                                    header={<div style={{display: 'flex', justifyContent: 'space-between'}}>
                                        <span>File List</span>
                                        <Button onClick={downloadAllFn}>Download All</Button>
                                    </div>}
                                    bordered
                                    dataSource={download.files}
                                    renderItem={(file) => (
                                        <List.Item>
                                            <a href={file.blobUrl} download={file.name}>{file.name} <DownloadOutlined /></a>
                                        </List.Item>
                                    )}
                                    />
                            </div>
                        </div>
                </Card>
            </Col>
        </Row>
    )
}

export default App
