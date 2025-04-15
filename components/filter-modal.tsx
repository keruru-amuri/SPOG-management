"use client"

import { useState, useEffect } from "react"
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"

export type FilterCriteria = {
  categories: string[];
  stockLevel: 'all' | 'low' | 'critical' | 'normal';
  minStock: number;
  maxStock: number;
  units: string[];
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterCriteria) => void;
  availableCategories: string[];
  availableUnits: string[];
  currentFilters: FilterCriteria;
}

export function FilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  availableCategories,
  availableUnits,
  currentFilters
}: FilterModalProps) {
  // Initialize state with current filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters.categories || []);
  const [stockLevel, setStockLevel] = useState<'all' | 'low' | 'critical' | 'normal'>(currentFilters.stockLevel || 'all');
  const [minStock, setMinStock] = useState<number>(currentFilters.minStock || 0);
  const [maxStock, setMaxStock] = useState<number>(currentFilters.maxStock || 100);
  const [selectedUnits, setSelectedUnits] = useState<string[]>(currentFilters.units || []);

  // Reset filters to current values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(currentFilters.categories || []);
      setStockLevel(currentFilters.stockLevel || 'all');
      setMinStock(currentFilters.minStock || 0);
      setMaxStock(currentFilters.maxStock || 100);
      setSelectedUnits(currentFilters.units || []);
    }
  }, [isOpen, currentFilters]);

  // Handle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  // Handle unit selection
  const toggleUnit = (unit: string) => {
    setSelectedUnits(prev => 
      prev.includes(unit) 
        ? prev.filter(u => u !== unit) 
        : [...prev, unit]
    );
  };

  // Apply filters
  const handleApplyFilters = () => {
    onApplyFilters({
      categories: selectedCategories,
      stockLevel,
      minStock,
      maxStock,
      units: selectedUnits
    });
    onClose();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategories([]);
    setStockLevel('all');
    setMinStock(0);
    setMaxStock(100);
    setSelectedUnits([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Inventory</DialogTitle>
          <DialogDescription>
            Set criteria to filter inventory items
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Accordion type="single" collapsible className="w-full">
            {/* Categories Filter */}
            <AccordionItem value="categories">
              <AccordionTrigger>Categories</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {availableCategories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`category-${category}`} 
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => toggleCategory(category)}
                      />
                      <Label htmlFor={`category-${category}`}>{category}</Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Stock Level Filter */}
            <AccordionItem value="stockLevel">
              <AccordionTrigger>Stock Level</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={stockLevel === 'all' ? "default" : "outline"} 
                      onClick={() => setStockLevel('all')}
                      className="w-full"
                    >
                      All
                    </Button>
                    <Button 
                      variant={stockLevel === 'normal' ? "default" : "outline"} 
                      onClick={() => setStockLevel('normal')}
                      className="w-full"
                    >
                      Normal
                    </Button>
                    <Button 
                      variant={stockLevel === 'low' ? "default" : "outline"} 
                      onClick={() => setStockLevel('low')}
                      className="w-full text-amber-500"
                    >
                      Low
                    </Button>
                    <Button 
                      variant={stockLevel === 'critical' ? "default" : "outline"} 
                      onClick={() => setStockLevel('critical')}
                      className="w-full text-red-500"
                    >
                      Critical
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Stock Percentage Range</Label>
                      <span className="text-sm text-muted-foreground">
                        {minStock}% - {maxStock}%
                      </span>
                    </div>
                    <div className="pt-4">
                      <Slider 
                        defaultValue={[minStock, maxStock]} 
                        min={0} 
                        max={100} 
                        step={5}
                        onValueChange={(values) => {
                          setMinStock(values[0]);
                          setMaxStock(values[1]);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Units Filter */}
            <AccordionItem value="units">
              <AccordionTrigger>Units</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {availableUnits.map((unit) => (
                    <div key={unit} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`unit-${unit}`} 
                        checked={selectedUnits.includes(unit)}
                        onCheckedChange={() => toggleUnit(unit)}
                      />
                      <Label htmlFor={`unit-${unit}`}>{unit}</Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleResetFilters} className="sm:w-auto w-full">
            Reset Filters
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
