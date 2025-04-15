"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { createInventoryItem } from "@/lib/db/inventory"
import { getAllLocations } from "@/lib/db/locations"

// Define unit categories and their units
const unitCategories = [
  {
    name: "Volume",
    units: [
      { value: "ml", label: "Milliliter (ml)" },
      { value: "cl", label: "Centiliter (cl)" },
      { value: "l", label: "Liter (l)" }, // Changed from L to l for consistency
      { value: "fl_oz", label: "Fluid Ounce (fl oz)" }, // Changed key to fl_oz
      { value: "pt", label: "Pint (pt)" },
      { value: "qt", label: "Quart (qt)" },
      { value: "gal", label: "Gallon (gal)" },
    ]
  },
  {
    name: "Weight",
    units: [
      { value: "mg", label: "Milligram (mg)" },
      { value: "g", label: "Gram (g)" },
      { value: "kg", label: "Kilogram (kg)" },
      { value: "oz_wt", label: "Ounce (oz)" }, // Changed key to oz_wt
      { value: "lb", label: "Pound (lb)" },
    ]
  },
  {
    name: "Length",
    units: [
      { value: "mm", label: "Millimeter (mm)" },
      { value: "cm", label: "Centimeter (cm)" },
      { value: "m", label: "Meter (m)" },
      { value: "in", label: "Inch (in)" },
      { value: "ft", label: "Foot (ft)" },
      { value: "yd", label: "Yard (yd)" },
    ]
  },
  {
    name: "Area",
    units: [
      { value: "cm²", label: "Square Centimeter (cm²)" },
      { value: "m²", label: "Square Meter (m²)" },
      { value: "in²", label: "Square Inch (in²)" },
      { value: "ft²", label: "Square Foot (ft²)" },
    ]
  },
  {
    name: "Count",
    units: [
      { value: "pcs", label: "Pieces (pcs)" },
      { value: "dozen", label: "Dozen" },
      { value: "box", label: "Box" },
      { value: "pack", label: "Pack" },
      { value: "set", label: "Set" },
    ]
  },
]

// Flatten all units for easy lookup
const allUnits = unitCategories.flatMap(category => category.units)

// Get compatible consumption units for a given unit
const getCompatibleUnits = (unit: string) => {
  // Find the category of the selected unit
  const selectedUnitLower = unit.toLowerCase()
  const category = unitCategories.find(cat =>
    cat.units.some(u => u.value.toLowerCase() === selectedUnitLower)
  )

  if (!category) return allUnits // If category not found, return all units

  return category.units // Return units from the same category
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locations, setLocations] = useState<{id: string, name: string}[]>([])

  // Form state
  const [formData, setFormData] = useState({
    item_code: '',
    name: '',
    category: '',
    description: '',
    location_id: '',
    unit: '',
    consumption_unit: '',
    original_amount: '',
    current_balance: '',
    min_threshold: '',
    critical_threshold: '',
  })

  // Track validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})

  // Get compatible consumption units based on selected unit
  const compatibleUnits = useMemo(() => {
    return formData.unit ? getCompatibleUnits(formData.unit) : allUnits
  }, [formData.unit])

  // Load locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const locationData = await getAllLocations()
        setLocations(locationData)
      } catch (error) {
        console.error('Error fetching locations:', error)
      }
    }

    if (isOpen) {
      fetchLocations()
    }
  }, [isOpen])

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      resetForm()
      setValidationErrors({})
    }
  }, [isOpen])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear validation error for this field if it has a value now
    if (value && validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear validation error for this field if it has a value now
    if (value && validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Calculate thresholds based on original amount
  const calculateThresholds = (originalAmount: string) => {
    const amount = parseFloat(originalAmount)
    if (!isNaN(amount)) {
      setFormData(prev => ({
        ...prev,
        min_threshold: Math.floor(amount * 0.2).toString(), // 20% of original amount
        critical_threshold: Math.floor(amount * 0.1).toString(), // 10% of original amount
      }))
    }
  }

  // Handle original amount change
  const handleOriginalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({
      ...prev,
      original_amount: value,
      current_balance: value // Set current balance to original amount by default
    }))
    calculateThresholds(value)

    // Clear validation error for this field if it has a value now
    if (value && validationErrors.original_amount) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.original_amount
        return newErrors
      })
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      item_code: '',
      name: '',
      category: '',
      description: '',
      location_id: '',
      unit: '',
      consumption_unit: '',
      original_amount: '',
      current_balance: '',
      min_threshold: '',
      critical_threshold: '',
    })
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add inventory items",
        variant: "destructive"
      })
      return
    }

    // Validate required fields
    const requiredFields = ['item_code', 'name', 'location_id', 'unit', 'original_amount']
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])

    // Reset validation errors
    const newValidationErrors: Record<string, boolean> = {}

    if (missingFields.length > 0) {
      // Mark missing fields as invalid
      missingFields.forEach(field => {
        newValidationErrors[field] = true
      })

      setValidationErrors(newValidationErrors)

      // Show toast notification
      toast({
        title: "Missing Required Fields",
        description: `Please fill in all required fields marked with *`,
        variant: "destructive"
      })
      return
    }

    // Clear validation errors if all required fields are filled
    setValidationErrors({})

    setIsSubmitting(true)
    try {
      // Convert numeric strings to numbers
      const numericFields = ['original_amount', 'current_balance', 'min_threshold', 'critical_threshold']
      const processedData = { ...formData }

      numericFields.forEach(field => {
        if (processedData[field as keyof typeof processedData]) {
          processedData[field as keyof typeof processedData] = parseFloat(processedData[field as keyof typeof processedData] as string).toString()
        }
      })

      // Set consumption unit to unit if not provided
      if (!processedData.consumption_unit) {
        processedData.consumption_unit = processedData.unit
      }

      // Create the item
      const newItem = await createInventoryItem(processedData)

      if (newItem) {
        toast({
          title: "Item Added",
          description: `Successfully added ${newItem.name} to inventory`,
        })
        resetForm()
        onClose()
      } else {
        toast({
          title: "Error",
          description: "Failed to add inventory item",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error adding inventory item:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          setValidationErrors({});
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new item to your inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_code" className={validationErrors.item_code ? "text-destructive" : ""}>Item Code *</Label>
              <Input
                id="item_code"
                name="item_code"
                placeholder="e.g., SP001"
                value={formData.item_code}
                onChange={handleChange}
                className={validationErrors.item_code ? "border-destructive" : ""}
              />
              {validationErrors.item_code && (
                <p className="text-xs text-destructive">Item Code is required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className={validationErrors.name ? "text-destructive" : ""}>Item Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Silicone Sealant"
                value={formData.name}
                onChange={handleChange}
                className={validationErrors.name ? "border-destructive" : ""}
              />
              {validationErrors.name && (
                <p className="text-xs text-destructive">Item Name is required</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder="e.g., Sealant"
                value={formData.category}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_id" className={validationErrors.location_id ? "text-destructive" : ""}>Location *</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => handleSelectChange('location_id', value)}
              >
                <SelectTrigger className={validationErrors.location_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.location_id && (
                <p className="text-xs text-destructive">Location is required</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="Optional description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit" className={validationErrors.unit ? "text-destructive" : ""}>Unit of Measurement *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => handleSelectChange('unit', value)}
              >
                <SelectTrigger className={validationErrors.unit ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {unitCategories.map((category) => (
                    <div key={category.name}>
                      <div className="px-2 py-1.5 text-sm font-semibold">{category.name}</div>
                      {category.units.map((unit) => (
                        <SelectItem key={`${category.name}-${unit.value}`} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                      {category.name !== unitCategories[unitCategories.length - 1].name && (
                        <div className="h-px bg-muted my-1" />
                      )}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.unit && (
                <p className="text-xs text-destructive">Unit of Measurement is required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="consumption_unit">Consumption Unit</Label>
              <Select
                value={formData.consumption_unit}
                onValueChange={(value) => handleSelectChange('consumption_unit', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Same as Unit if left empty" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {compatibleUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="original_amount" className={validationErrors.original_amount ? "text-destructive" : ""}>Original Amount *</Label>
              <Input
                id="original_amount"
                name="original_amount"
                type="number"
                placeholder="e.g., 5000"
                value={formData.original_amount}
                onChange={handleOriginalAmountChange}
                className={validationErrors.original_amount ? "border-destructive" : ""}
              />
              {validationErrors.original_amount && (
                <p className="text-xs text-destructive">Original Amount is required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_balance">Current Balance</Label>
              <Input
                id="current_balance"
                name="current_balance"
                type="number"
                placeholder="Same as Original Amount if left empty"
                value={formData.current_balance}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_threshold">Low Stock Threshold</Label>
              <Input
                id="min_threshold"
                name="min_threshold"
                type="number"
                placeholder="Auto-calculated if left empty"
                value={formData.min_threshold}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="critical_threshold">Critical Stock Threshold</Label>
              <Input
                id="critical_threshold"
                name="critical_threshold"
                type="number"
                placeholder="Auto-calculated if left empty"
                value={formData.critical_threshold}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              setValidationErrors({});
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
