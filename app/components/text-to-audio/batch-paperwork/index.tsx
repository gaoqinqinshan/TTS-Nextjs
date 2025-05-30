import { Button, Popconfirm, Progress, Space, Table, Tag, Upload, UploadProps, message } from 'antd'
import React, { EventHandler, HtmlHTMLAttributes, useEffect, useState } from 'react'
import { CloudDownloadOutlined, QuestionCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import AudioControl from '../../common/audio-control';
import { downloadAudioFile, zipFileByBlobUrl } from '@/utils/common-methods';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useTextToSpeechConfig } from '@/store/text-to-speech-config';
import UploadFilePage from '@/components/common/upload-file-page';
import AudioConfig from '../audio-config';
import styles from './index.module.css'
import { AudioBtnConfig, SpeechConfigType } from '@/interface';
import { getStyleRoleName, getVoiceName } from '@/store';
// 文本生成音乐
type TableDataType = {
  id: string;
  fileName: string;
  blobUrl?: string;
  content: string;
  status: "active" | "normal" | "exception" | "success";
  audioConf: Omit<SpeechConfigType, "isSSML" | "text" | "playDefault">;
}

function BatchPaperwork(props: any) {
  const [selectedRow, setSelectedRow] = useState<TableDataType[]>([]);
  const [tableData, setTableData] = useState<TableDataType[]>([]);
  const [progress, setProgress] = useState<any>({})
  const { plainText } = useTextToSpeech()
  const { getSpeechParams, update, audioConfig } = useTextToSpeechConfig();

  const columns: ColumnsType<TableDataType> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      width: 150,
    },
    {
      title: '音频',
      dataIndex: 'blobUrl',
      key: 'blobUrl',
      align: "center",
      render: (_, record) => {
        return (<>
          {record.blobUrl && <AudioControl showDownBtn={false} style={{ height: 30 }} src={record.blobUrl} autoPlay={false} fileName={record.fileName} />}
          {!record.blobUrl && <Progress size="small" percent={selectedRow.filter(keys => keys.id === record.id).length && progress[record.id]} status={record.status ?? "active"} />}
        </>)
      }
    },
    {
      title: "配置项",
      dataIndex: "audioConf",
      key: "audioConf",
      align: "center",
      render:(_, record) => {
        return <>
          <Tag color="cyan" style={{marginBottom:1}}>{getStyleRoleName(record.audioConf.language)}</Tag>
          {record.audioConf.voice && <Tag color="purple">{getVoiceName(record.audioConf.language,record.audioConf.voice)} - {getStyleRoleName(record.audioConf.style!)}</Tag>}
        </>
      }
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      width: 80,
      render: (_, record) => (
        <Space>
          <CloudDownloadOutlined style={{ cursor: record.blobUrl ? "pointer" : "not-allowed", color: record.blobUrl ? 'green' : '#717171' }}
            onClick={(e) => {
              e.stopPropagation();
              record.blobUrl && downloadAudioFile(record.blobUrl, record.fileName.replace(/\.txt/, audioConfig.download))
            }} />
          <DeleteOutlined style={{ cursor: "pointer", color: 'red' }} onClick={(e) => deleteRecore(record, e)} />
        </Space>
      ),
    },
  ];

  // 列表勾选回调
  const onSelectChange = (newSelectedRowKeys: React.Key[], newSelectedRow: TableDataType[]) => {
    setSelectedRow(newSelectedRow);
    setProgress({});
  };

  // 清空列表
  const tableClear = () => {
    setTableData([]);
    setSelectedRow([]);
    setProgress({});
  }

  // 删除某行
  const deleteRecore = (record: TableDataType, e: any) => {
    e.stopPropagation();
    setTableData((data) => data.filter(item => item.id !== record.id))
  }

  /** 生成配音 */
  const generate = async () => {
    await new Promise(resolve => {
      selectedRow.forEach(item => {
        const interval = setInterval(() => {
          setProgress((prevProgress: any) => ({
            ...prevProgress,
            [item.id]: (parseInt(prevProgress[item.id]) || 0) + Math.floor(Math.random() * 5),
            [item.id + "_timer"]: interval
          }));
        }, 500);
      })
      resolve(undefined);
    })
    for (const item of selectedRow) {
      debugger
      const result = await plainText({ ...getSpeechParams(), text: item.content, ...item.audioConf });
      if (result.status === 200) {
        message.success(item.fileName + "生成配音成功!");
        await asyncWriteTableData(item.id, { blobUrl: result.data, status: "success" })
        setProgress((prevProgress: any) => ({
          ...prevProgress,
          [item.id]: 100,
        }));
      } else {
        await asyncWriteTableData(item.id, { status: 'exception' })
        setProgress((prevProgress: any) => ({
          ...prevProgress,
          [item.id]: 100,
        }));
        message.error(item.fileName + ' ' + result.message.privErrorDetails);
      }
    }
  }

  /** 异步修改列表数据 */
  const asyncWriteTableData = async (id: string, writeobj: any) => {
    await new Promise(resolve =>
      setTableData(table => {
        return table.map((keys) =>
          keys.id === id ? { ...keys, ...writeobj } : keys
          , resolve(undefined))
      })
    )
  }

  // 批量下载
  const downloadAll = async () => {
    const canDownload = selectedRow.filter(keys => keys.blobUrl)
    if (!canDownload.length) {
      message.error("请勾选已配音成功的选项");
      return false;
    }
    await zipFileByBlobUrl(canDownload, audioConfig.download);
    message.success(`下载成功条数：${canDownload.length}。${canDownload.length !== selectedRow.length ? '已过滤掉未配音的数据' : ''}`)
    setSelectedRow([])
  }

  /** 应用配置 回调 */
  const audioConfigCb = (data: any) => {
    setTableData(tabledata => tabledata.map(item => item.id === selectedRow[0].id ? {...item, audioConf: data } : item))
  }

  /** 文件变更的回调 */
  const uploadFileCb = (data: TableDataType[]) => {
    setTableData(tableData => {
      const ids = tableData.map(keys => keys.id);
      return data.map(keys => ids.includes(keys.id) && keys.audioConf ? keys : {...keys, audioConf: {
        language: "zh-CN",
        voice: "",
        style: "Default",
        role: "Default",
        speed: 1,
        tone: 1,
        quality: 3,
      }})
    })
  }

  /** 选中当前行 */
  const rowClick = (record: TableDataType) => {
    setSelectedRow([record])
  }

  useEffect(() => {
    selectedRow.forEach(item => {
      if ((progress[item.id]) >= 100) {
        clearInterval(progress[item.id + "_timer"]);
        setSelectedRow(selectedRow => selectedRow.filter(keys => keys.id !== item.id));
      }
    })
  }, [progress])


  return (
    <div className={styles.continar}>
      <div className={styles['uploader-box']}>
        {
          !tableData.length && (<UploadFilePage<TableDataType> style={{ height: '100%' }} tableData={tableData} setTableData={uploadFileCb} />
          )
        }

        {
          !!tableData.length && (<>
            <Space style={{ marginBottom: 5 }}>
              <Button type="primary" children="批量配音" size="small" disabled={!selectedRow.length} onClick={generate} />
              <Button children="批量下载" size="small" disabled={!selectedRow.length} onClick={downloadAll} />
              <Popconfirm
                title="清空提示"
                description="你确定要清空列表吗?"
                icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                onConfirm={tableClear}
              >
                <Button children="清空" size="small" disabled={!selectedRow.length} />
              </Popconfirm>
            </Space>
            <Table columns={columns} dataSource={tableData} rowKey={"id"} pagination={false}
              rowSelection={{
                selectedRowKeys: selectedRow.map(item => item.id),
                onChange: onSelectChange,
              }}
              size="small"
              onRow={(record) => {
                return {
                  onClick: () => rowClick(record)
                };
              }}
            />
            {tableData.length < 5 && <UploadFilePage<TableDataType> tableData={tableData} setTableData={uploadFileCb} style={{marginTop: 10}} />}
          </>)
        }
      </div >
      <div className={styles.config}>
        <AudioConfig buttonType={AudioBtnConfig.FILESYTHESIS} configCb={audioConfigCb} currentConfig={selectedRow.length === 1 ? selectedRow[0].audioConf : undefined } />
      </div>
    </div>
  )
}

export default BatchPaperwork