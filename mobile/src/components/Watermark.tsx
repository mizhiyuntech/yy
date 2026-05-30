import React, { useMemo } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

const TILE_WIDTH = 130
const TILE_HEIGHT = 90

type Props = {
  text?: string
}

// Watermark renders a non-interactive, full-screen tiled diagonal watermark that
// overlays every page of the app. pointerEvents="none" keeps it from blocking touches.
export default function Watermark({ text = '山东法院IM' }: Props) {
  const { width, height } = useWindowDimensions()

  const tiles = useMemo(() => {
    const cols = Math.ceil(width / TILE_WIDTH) + 1
    const rows = Math.ceil(height / TILE_HEIGHT) + 1
    const result: React.ReactNode[] = []
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        result.push(
          <View key={`${r}-${c}`} style={styles.tile}>
            <Text style={styles.text}>{text}</Text>
          </View>,
        )
      }
    }
    return result
  }, [width, height, text])

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.grid}>{tiles}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: TILE_WIDTH, height: TILE_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  text: {
    color: 'rgba(0, 0, 0, 0.06)',
    fontSize: 15,
    fontWeight: '500',
    transform: [{ rotate: '-30deg' }],
  },
})
