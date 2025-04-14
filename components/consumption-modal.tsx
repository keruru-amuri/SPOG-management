"use client"

import { useState } from "react"
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
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Item {
  id: string;
  name: string;
  currentBalance: number;
  originalAmount: number;
  unit: string;
  consumptionUnit: string;
  location: string;
  status: 'normal' | 'low' | 'critical';
}

export function ConsumptionModal({ item, isOpen, onClose }: { item: Item; isOpen: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [adjustedAmount, setAdjustedAmount] = useState("")
  const [reason, setReason] = useState("")

  const handleConsumptionSubmit = () => {
    // Here you would handle the consumption logic
    console.log(`Consumed ${amount} ${item.consumptionUnit} of ${item.name}`)
    setAmount("")
    onClose()
  }

  const handleAdjustmentSubmit = () => {
    // Here you would handle the adjustment logic
    console.log(`Adjusted ${item.name} to ${adjustedAmount} ${item.unit}. Reason: ${reason}`)
    setAdjustedAmount("")
    setReason("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            ID: {item.id} | Location: {item.location}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="consume" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consume">Record Consumption</TabsTrigger>
            <TabsTrigger value="adjust" disabled={!isAdmin}>
              Adjust Balance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consume" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-medium">
                  {item.currentBalance} {item.unit}
                </span>
              </div>
              <Progress
                value={(item.currentBalance / item.originalAmount) * 100}
                className={`h-2 ${getProgressColorClass(item.status)}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 {item.unit}</span>
                <span>
                  {item.originalAmount} {item.unit}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="col-span-4">
                  Amount Used ({item.consumptionUnit})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Enter amount in ${item.consumptionUnit}`}
                  className="col-span-3"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="flex h-10 items-center justify-center rounded-md border bg-muted px-4">
                  {item.consumptionUnit}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConsumptionSubmit} disabled={!amount}>
                Record Usage
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="adjust" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adjusted-amount" className="col-span-4">
                  New Balance ({item.unit})
                </Label>
                <Input
                  id="adjusted-amount"
                  type="number"
                  placeholder={`Enter new amount in ${item.unit}`}
                  className="col-span-3"
                  value={adjustedAmount}
                  onChange={(e) => setAdjustedAmount(e.target.value)}
                />
                <div className="flex h-10 items-center justify-center rounded-md border bg-muted px-4">{item.unit}</div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason">Reason for Adjustment</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Physical count, New container"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleAdjustmentSubmit} disabled={!adjustedAmount}>
                Update Balance
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function getProgressColorClass(status) {
  if (status === "normal") {
    return "bg-green-100 dark:bg-green-950"
  } else if (status === "low") {
    return "bg-amber-100 dark:bg-amber-950"
  } else if (status === "critical") {
    return "bg-red-100 dark:bg-red-950"
  }
  return ""
}
