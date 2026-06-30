// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `*`
  | `/`
  | `/api-status`
  | `/daily`
  | `/edition`
  | `/email`
  | `/home`
  | `/inbox`
  | `/scorecard`
  | `/u/:userId`

export type Params = {
  '/*': { '*': string }
  '/u/:userId': { userId: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
