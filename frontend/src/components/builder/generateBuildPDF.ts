"use client"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ComponentSlot } from "./types"
import { COMPONENT_CONFIGS } from "./constants"

interface GeneratePDFOptions {
  slots: ComponentSlot[]
  baseTotal: number
  minPriceTotal: number
}

// Theme colors converted from globals.css oklch values to RGB
// Primary: oklch(0.6171 0.1375 39.0427) ≈ Warm copper/orange
// These colors match the RigForge BD brand theme
const THEME_COLORS = {
  // Primary brand color - warm copper/orange from theme
  primary: [194, 97, 53] as [number, number, number],
  primaryDark: [160, 75, 40] as [number, number, number],
  
  // Text colors
  foreground: [75, 65, 60] as [number, number, number],
  mutedForeground: [140, 135, 130] as [number, number, number],
  
  // Background colors
  background: [250, 249, 247] as [number, number, number],
  muted: [235, 230, 225] as [number, number, number],
  
  // Accent colors
  success: [34, 160, 80] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

export function generateBuildPDF({ slots, baseTotal, minPriceTotal }: GeneratePDFOptions) {
  const selectedSlots = slots.filter((slot) => slot.isSelected && slot.product)
  
  if (selectedSlots.length === 0) {
    return
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - (margin * 2)

  // ===== HEADER SECTION =====
  // Brand background
  doc.setFillColor(...THEME_COLORS.primary)
  doc.rect(0, 0, pageWidth, 38, "F")
  
  // Subtle darker strip at bottom of header
  doc.setFillColor(...THEME_COLORS.primaryDark)
  doc.rect(0, 35, pageWidth, 3, "F")

  // Brand name
  doc.setTextColor(...THEME_COLORS.white)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(26)
  doc.text("RigForge BD", margin, 18)

  // Tagline
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(255, 240, 230)
  doc.text("Build Your Dream PC", margin, 28)

  // Date on right
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.setFontSize(9)
  doc.setTextColor(...THEME_COLORS.white)
  doc.text(currentDate, pageWidth - margin, 16, { align: "right" })
  doc.setFontSize(10)
  doc.text("PC Build Summary", pageWidth - margin, 25, { align: "right" })

  // ===== TITLE SECTION =====
  let yPos = 52

  doc.setTextColor(...THEME_COLORS.foreground)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("Your Custom PC Build", margin, yPos)

  yPos += 7
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...THEME_COLORS.mutedForeground)
  doc.text(`${selectedSlots.length} component${selectedSlots.length > 1 ? "s" : ""} selected`, margin, yPos)

  yPos += 10

  // ===== COMPONENTS TABLE =====
  const tableData = selectedSlots.map((slot) => {
    const config = COMPONENT_CONFIGS.find((c) => c.category === slot.category)
    
    // Get the price and retailer based on selection or find the best price retailer
    let price = slot.product?.minPrice || 0
    let retailer = "-"
    
    if (slot.selectedRetailer && slot.product) {
      // User selected a specific retailer
      retailer = slot.selectedRetailer
      const normalizedRetailer = slot.selectedRetailer.toLowerCase().replace(/\s+/g, "")
      const priceInfo = slot.product.prices.find((p) => {
        const normalizedPriceName = p.shop.toLowerCase().replace(/\s+/g, "")
        return (
          normalizedPriceName === normalizedRetailer ||
          normalizedPriceName.includes(normalizedRetailer) ||
          normalizedRetailer.includes(normalizedPriceName)
        )
      })
      if (priceInfo) {
        price = priceInfo.price
      }
    } else if (slot.product && slot.product.prices.length > 0) {
      // Find the retailer with the minimum price
      const minPriceInfo = slot.product.prices.reduce((min, current) => 
        current.price < min.price ? current : min
      , slot.product.prices[0])
      
      retailer = minPriceInfo.shop
      price = minPriceInfo.price
    }

    const totalPrice = price * slot.quantity

    return [
      config?.label || slot.category,
      slot.product?.name || "-",
      `x${slot.quantity}`,
      retailer,
      `BDT ${totalPrice.toLocaleString()}`,
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [["Component", "Product Name", "Qty", "Retailer", "Price (BDT)"]],
    body: tableData,
    theme: "grid",
    tableWidth: contentWidth,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak",
      lineColor: THEME_COLORS.muted,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: THEME_COLORS.primary,
      textColor: THEME_COLORS.white,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
      halign: "center",
      overflow: "visible",
      minCellHeight: 10,
    },
    bodyStyles: {
      textColor: THEME_COLORS.foreground,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: THEME_COLORS.background,
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold", halign: "left" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 32, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Footer on each page
      doc.setFontSize(8)
      doc.setTextColor(...THEME_COLORS.mutedForeground)
      doc.text(
        "Generated by RigForge BD • www.rigforgebd.com",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      )
    },
  })

  // Get the final Y position after the table
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // ===== TOTALS SECTION =====
  const totalsY = finalY + 12

  // Background card for totals
  doc.setFillColor(...THEME_COLORS.muted)
  doc.roundedRect(margin, totalsY, contentWidth, 40, 3, 3, "F")
  
  // Accent border on left
  doc.setFillColor(...THEME_COLORS.primary)
  doc.rect(margin, totalsY, 4, 40, "F")

  // Totals header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(...THEME_COLORS.foreground)
  doc.text("Price Summary", margin + 10, totalsY + 10)

  // Divider line
  doc.setDrawColor(...THEME_COLORS.mutedForeground)
  doc.setLineWidth(0.3)
  doc.line(margin + 10, totalsY + 14, margin + contentWidth - 10, totalsY + 14)

  // Selected Retailers Total
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...THEME_COLORS.mutedForeground)
  doc.text("Selected Retailers Total:", margin + 10, totalsY + 23)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...THEME_COLORS.primary)
  doc.text(`BDT ${baseTotal.toLocaleString()}`, margin + 75, totalsY + 23)

  // Best Prices Total
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...THEME_COLORS.mutedForeground)
  doc.text("Best Prices Total:", margin + 10, totalsY + 32)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...THEME_COLORS.success)
  doc.text(`BDT ${minPriceTotal.toLocaleString()}`, margin + 75, totalsY + 32)

  // Potential savings on right side
  const savings = baseTotal - minPriceTotal
  if (savings > 0) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...THEME_COLORS.success)
    doc.text("Potential Savings", pageWidth - margin - 10, totalsY + 23, { align: "right" })
    doc.setFontSize(12)
    doc.text(`BDT ${savings.toLocaleString()}`, pageWidth - margin - 10, totalsY + 32, { align: "right" })
  }

  // ===== DISCLAIMER =====
  const disclaimerY = totalsY + 52

  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor(...THEME_COLORS.mutedForeground)
  doc.text(
    "Note: Prices are subject to change. Please verify prices with retailers before purchasing.",
    margin,
    disclaimerY
  )
  doc.text(
    "VAT and delivery charges may apply. This document is for reference purposes only.",
    margin,
    disclaimerY + 4
  )

  // ===== SAVE PDF =====
  const fileName = `RigForge-Build-${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(fileName)
}
