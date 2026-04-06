"use client";

import { useState } from "react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";

interface Member {
  memberId: string;
  displayName: string;
  role: string;
  joinedAt: string;
}

interface MemberListProps {
  members: Member[];
  currentUserRole: string;
  clubId: string;
  onRoleChange: (memberId: string, newRole: string) => Promise<void>;
}

export function MemberList({
  members,
  currentUserRole,
  clubId: _clubId,
  onRoleChange,
}: MemberListProps) {
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setLoadingMemberId(memberId);
    try {
      await onRoleChange(memberId, newRole);
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          {currentUserRole === "owner" && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.memberId}>
            <TableCell className="font-medium">
              {member.displayName}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  member.role === "owner"
                    ? "default"
                    : member.role === "admin"
                      ? "secondary"
                      : "outline"
                }
              >
                {member.role}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(member.joinedAt).toLocaleDateString("th-TH")}
            </TableCell>
            {currentUserRole === "owner" && (
              <TableCell>
                {member.role !== "owner" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingMemberId === member.memberId}
                    onClick={() =>
                      handleRoleChange(
                        member.memberId,
                        member.role === "admin" ? "member" : "admin"
                      )
                    }
                  >
                    {loadingMemberId === member.memberId
                      ? "..."
                      : member.role === "admin"
                        ? "Demote to Member"
                        : "Promote to Admin"}
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
