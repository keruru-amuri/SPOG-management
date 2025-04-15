"use client"

import { useState } from "react"
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
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { recordConsumption } from "@/lib/db/consumption"
import { updateInventoryItem } from "@/lib/db/inventory"
import { toast } from "@/components/ui/use-toast"

// Extend the Session type to include the user role and id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    }
  }
}

export interface Item {
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
  const { data: session } = useSession()
  const [amount, setAmount] = useState("")
  const [isAdmin] = useState(session?.user?.role === 'admin' || false)
  const [adjustedAmount, setAdjustedAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConsumptionSubmit = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to record consumption",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Convert amount to number
      const numAmount = parseFloat(amount)

      // Record consumption in the database
      const result = await recordConsumption(
        item.id,
        session.user.id,
        numAmount,
        reason || undefined
      )

      if (result.success) {
        toast({
          title: "Consumption Recorded",
          description: `Successfully recorded ${numAmount} ${item.consumptionUnit} of ${item.name}`,
        })
        setAmount("")
        setReason("")
        setErrorMessage(null) // Clear any previous error
        onClose()
      } else {
        // Format the error message to be more user-friendly
        let formattedError = result.message || "Failed to record consumption";

        // If it's a balance error, make it more readable
        if (formattedError.includes('Not enough balance:')) {
          const parts = formattedError.split('Not enough balance:');
          if (parts.length > 1) {
            formattedError = `Insufficient stock: ${parts[1].trim()}`;
          }
        }

        // Set the error message to display in the modal
        setErrorMessage(formattedError)
        setIsSubmitting(false)
      }
    } catch (error: any) {
      console.warn('Error recording consumption:', error) // Changed from error to warn to avoid console errors

      // Try to extract a meaningful error message
      let formattedError = "An unexpected error occurred";

      if (error?.message) {
        // If it's a balance error, make it more readable
        if (error.message.includes('Not enough balance:')) {
          const parts = error.message.split('Not enough balance:');
          if (parts.length > 1) {
            formattedError = `Insufficient stock: ${parts[1].trim()}`;
          } else {
            formattedError = "Insufficient stock available";
          }
        } else {
          formattedError = error.message;
        }
      }

      // Set the error message to display in the modal
      setErrorMessage(formattedError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdjustmentSubmit = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to adjust inventory",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Convert amount to number
      const numAmount = parseFloat(adjustedAmount)

      // Update the inventory item in the database
      const updatedItem = await updateInventoryItem(item.id, {
        current_balance: numAmount
        // updated_at is handled automatically by Supabase
      })

      if (updatedItem) {
        toast({
          title: "Inventory Updated",
          description: `Successfully adjusted ${item.name} to ${numAmount} ${item.unit}`,
        })
        setAdjustedAmount("")
        setReason("")
        setErrorMessage(null) // Clear any previous error
        onClose()
      } else {
        setErrorMessage("Failed to update inventory. Please try again.")
      }
    } catch (error: any) {
      console.warn('Error adjusting inventory:', error) // Changed from error to warn to avoid console errors

      // Set a user-friendly error message
      const errorMsg = error?.message || "An unexpected error occurred";
      setErrorMessage(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
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
                  onChange={(e) => {
                    setAmount(e.target.value);
                    // Clear error message when user changes input
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
                <div className="flex h-10 items-center justify-center rounded-md border bg-muted px-4">
                  {item.consumptionUnit}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="consumption-reason">Reason (Optional)</Label>
                <Input
                  id="consumption-reason"
                  placeholder="e.g., Maintenance, Repair"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    // Clear error message when user changes input
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <div className="space-y-2 w-full">
                <Button
                  onClick={handleConsumptionSubmit}
                  disabled={!amount || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Recording..." : "Record Usage"}
                </Button>

                {errorMessage && (
                  <div className="text-destructive text-sm font-medium p-2 border border-destructive bg-destructive/10 rounded-md">
                    {errorMessage}
                  </div>
                )}
              </div>
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
                  onChange={(e) => {
                    setAdjustedAmount(e.target.value);
                    // Clear error message when user changes input
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
                <div className="flex h-10 items-center justify-center rounded-md border bg-muted px-4">{item.unit}</div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason">Reason for Adjustment</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Physical count, New container"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    // Clear error message when user changes input
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <div className="space-y-2 w-full">
                <Button
                  onClick={handleAdjustmentSubmit}
                  disabled={!adjustedAmount || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Updating..." : "Update Balance"}
                </Button>

                {errorMessage && (
                  <div className="text-destructive text-sm font-medium p-2 border border-destructive bg-destructive/10 rounded-md">
                    {errorMessage}
                  </div>
                )}
              </div>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function getProgressColorClass(status: 'normal' | 'low' | 'critical'): string {
  if (status === "normal") {
    return "bg-green-100 dark:bg-green-950"
  } else if (status === "low") {
    return "bg-amber-100 dark:bg-amber-950"
  } else if (status === "critical") {
    return "bg-red-100 dark:bg-red-950"
  }
  return ""
}
