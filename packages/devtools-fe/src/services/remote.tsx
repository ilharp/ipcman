import { original } from 'immer'
import type { IpcMan } from 'ipcman'
import type { FC, ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { useImmer } from 'use-immer'

export interface IpcManInfo {
  startTime: number
}

export interface IpcManItem {
  index: number
  timestamp: number
  data: IpcMan.Data & {
    requestArgs?: unknown[]
    responseArgs?: unknown[]
  }
}

export interface RemoteIntl {
  data: IpcManItem[]
  info: IpcManInfo
}

const defultRemote = {
  data: [],
  info: {
    startTime: new Date().getTime(),
  },
}

export interface Remote extends RemoteIntl {}

export const RemoteContext = createContext<RemoteIntl>(defultRemote)

export const useRemote = (): Remote => {
  const { data, info } = useContext(RemoteContext)

  return {
    data,
    info,
  }
}

export const RemoteProvider: FC<{
  children?: ReactNode
}> = ({ children }) => {
  // const [data, editData] = useImmer<RemoteIntl>(defultRemote)
  const [data, setData] = useState<RemoteIntl>(defultRemote)

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    let remoteUrl: string
    if (searchParams.has('ws')) remoteUrl = searchParams.get('ws')!
    else remoteUrl = location.origin.replace(/^http/, 'ws') + '/v0/events'

    const ws = new WebSocket(remoteUrl)

    ws.addEventListener('message', (e) => {
      const newData = JSON.parse(e.data as string) as IpcManItem[]

      setData((prev) => {
        // console.log('prev', prev)
        prev.data.push(...newData.map(v=>({
          ...v,
          data: {
            ...v.data,
            requestArgs: v.data.type === 'receive' && v.data.args,
            responseArgs: v.data.type === 'send' && v.data.args,
          }
        })))
        return prev
      })

      // editData((draft) => {
      //   const originalList = original(draft).data.map((x) => x.index)

      //   for (const d of newData) {
      //     if (originalList.findIndex((x) => d.index === x) !== -1) continue

      //     switch (d.data.type) {
      //       case 'send':
      //         d.data.requestArgs = d.data.args
      //         break

      //       case 'receive':
      //         d.data.responseArgs = d.data.args
      //         break
      //     }

      //     // FIXME: If you freeze `d`, its stale proxy will magically leaked
      //     // and used by tanstack table. `JSON.stringify` will then throw errors like
      //     // `Cannot perform 'get' on a proxy that has been revoked.`
      //     // freeze(d)

      //     draft.data.push(d)
      //   }

      //   draft.data.forEach((x) => {
      //     if (x.data.responseArgs) return
      //     if (!x.data.binded) return
      //     // if (!x.data.id) return

      //     // const rType = x.data.type.replace('request', 'response') as
      //     //   | 'handle-response'
      //     //   | 'wrapped-response'

      //     // const r = newData.find((y) => y.data.type === rType)

      //     const r = draft.data.find(
      //       (y) => y !== x && x.data.bindId === (y.data as IpcMan.Data).bindId,
      //     )

      //     if (r) {
      //       // x.data.requestArgs = x.data.args
      //       x.data.responseArgs = r.data.args
      //       r.data.requestArgs = x.data.args
      //       // r.data.responseArgs = r.data.args
      //     }
      //   })
      // })
    })

    return () => ws.close()
  }, [])

  useEffect(
    () =>
      void (async () => {
        const info = (await (await fetch('/v0/info')).json()) as IpcManInfo
        // editData((draft) => void (draft.info = info))
        setData((prev) => {
          prev.info = info
          return prev
        })
      })(),
    [],
  )

  return <RemoteContext.Provider value={data} children={children} />
}
