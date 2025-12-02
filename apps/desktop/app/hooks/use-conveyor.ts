type ConveyorKey = keyof Window['conveyor']

/**
 * Use the conveyor for inter-process communication
 *
 * @param key - The key of the conveyor object to use
 * @returns The conveyor object or the keyed object
 */
export const useConveyor = <T extends ConveyorKey | undefined = undefined>(
  key?: T
): T extends ConveyorKey ? Window['conveyor'][T] : Window['conveyor'] => {
  const conveyor = window.conveyor

  if (key !== undefined) {
    return conveyor[key as ConveyorKey] as T extends ConveyorKey ? Window['conveyor'][T] : Window['conveyor']
  }

  return conveyor as T extends ConveyorKey ? Window['conveyor'][T] : Window['conveyor']
}