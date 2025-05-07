import { characterRecognitionModel } from "@/_server/characterRecognitionModel"
import { REQUESTERR, RESPONSEOK } from "@/constant"
import { SpeechToTextType } from "@/interface"
import { useFetch } from "./use-fetch"
//封装音频转文本的SDK 并返回统一格式的结果。
type UseVideoToTextProps = {
    videoRecognizer: (params: SpeechToTextType) => Promise<any>

}

export const useVideoToText = (): UseVideoToTextProps => {
    const fetch = useFetch();
    
    const videoRecognizer = async (data: SpeechToTextType) => {
        try{
            const result = await characterRecognitionModel.charachterForAudio(data)
            return Promise.resolve({
                ...RESPONSEOK,
                data: result
            });
        }catch(error:any) {
            return Promise.resolve({ ...REQUESTERR, message: '调用SDK失败：' + error })
        }
    }

    return {
        videoRecognizer,
    }
}