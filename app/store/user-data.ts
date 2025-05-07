import { create } from "zustand"

//管理当前登录用户的信息
export type IUser = {
    id: string;
    username: string;
    password: string;
}

 type IUserStore = {
    currentUser?: IUser
}

const initialState = {
    currentUser: undefined
}

export const userStore = create<IUserStore>(() => initialState)
